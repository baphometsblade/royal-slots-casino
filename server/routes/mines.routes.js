'use strict';

// Mines Game Routes
// GET  /api/mines/state   -- authenticated; get active game state (no mine positions)
// POST /api/mines/start   -- authenticated; start new game (bet + mines count)
// POST /api/mines/reveal  -- authenticated; reveal a tile
// POST /api/mines/cashout -- authenticated; cash out current winnings

var express=require('express');
var router=express.Router();
var db=require('../database');
var authenticate=require('../middleware/auth').authenticate;

var MIN_BET=0.25;
var MAX_BET=200;
var GRID_SIZE=25;

var schemaReady=false;

async function ensureSchema(){
  if(schemaReady)return;
  await db.run(
    'CREATE TABLE IF NOT EXISTS mines_games (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'user_id INTEGER NOT NULL,' +
    'bet REAL NOT NULL,' +
    'mines_count INTEGER NOT NULL,' +
    'mine_positions TEXT NOT NULL,' +
    'revealed TEXT NOT NULL DEFAULT \'[]\',' +
    'status TEXT NOT NULL DEFAULT \'active\',' +
    'payout REAL NOT NULL DEFAULT 0,' +
    'created_at TEXT DEFAULT (datetime(\'now\'))' +
    ')'
  );
  schemaReady=true;
}

function calcMultiplier(revealed_count,mines_count){
  var m=1.0;
  for(var i=0;i<revealed_count;i++){
    m*=(25-i)/(25-mines_count-i)*0.99;
  }
  return parseFloat(m.toFixed(4));
}

function placeMines(mines_count){
  var indices=[];
  for(var i=0;i<GRID_SIZE;i++){indices.push(i);}
  for(var j2=GRID_SIZE-1;j2>0;j2--){
    var k=Math.floor(Math.random()*(j2+1));
    var tmp=indices[j2];indices[j2]=indices[k];indices[k]=tmp;
  }
  return indices.slice(0,mines_count);
}

router.get('/state',authenticate,async function(req,res){
  try{
    await ensureSchema();
    var userId=req.user.id;
    var game=await db.get(
      'SELECT * FROM mines_games WHERE user_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1',
      [userId]
    );
    if(!game){return res.json({active:false});}
    var revealed=JSON.parse(game.revealed);
    var multiplier=calcMultiplier(revealed.length,game.mines_count);
    var potentialPayout=parseFloat((game.bet*multiplier).toFixed(2));
    return res.json({
      active:true,
      gameId:game.id,
      bet:game.bet,
      mines_count:game.mines_count,
      revealed:revealed,
      multiplier:multiplier,
      potentialPayout:potentialPayout,
      status:game.status
    });
  }catch(err){
    console.error('[mines] GET /state error:',err.message);
    return res.status(500).json({error:'Failed to get game state'});
  }
});

router.post('/start',authenticate,async function(req,res){
  try{
    await ensureSchema();
    var userId=req.user.id;
    var bet=parseFloat(req.body.bet);
    var mines=parseInt(req.body.mineCount,10);  // UI sends "mineCount"
    if(isNaN(mines))mines=3;
    if(isNaN(bet)||bet<MIN_BET||bet>MAX_BET){
      return res.status(400).json({error:'Bet must be between '+MIN_BET+' and '+MAX_BET});
    }
    if(mines<1||mines>24){
      return res.status(400).json({error:'Mines count must be between 1 and 24'});
    }
    // Forfeit any active game
    var existing=await db.get(
      'SELECT id FROM mines_games WHERE user_id = ? AND status = \'active\' LIMIT 1',
      [userId]
    );
    if(existing){
      await db.run(
        'UPDATE mines_games SET status = \'forfeited\' WHERE id = ?',
        [existing.id]
      );
    }
    var user=await db.get('SELECT balance FROM users WHERE id = ?',[userId]);
    if(!user)return res.status(404).json({error:'User not found'});
    var balance=parseFloat(user.balance)||0;
    if(balance<bet){return res.status(400).json({error:'Insufficient balance'});}
    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?',[bet,userId]);
    var minePositions=placeMines(mines);
    var result=await db.run(
      'INSERT INTO mines_games (user_id, bet, mines_count, mine_positions, revealed, status, payout) VALUES (?, ?, ?, ?, \'[]\', \'active\', 0)',
      [userId,bet,mines,JSON.stringify(minePositions)]
    );
    var updatedUser=await db.get('SELECT balance FROM users WHERE id = ?',[userId]);
    var newBalance=updatedUser?parseFloat(updatedUser.balance):(balance-bet);
    return res.json({success:true,gameId:result.lastID||result.id,mines:mines,bet:bet,newBalance:newBalance});
  }catch(err){
    console.error('[mines] POST /start error:',err.message);
    return res.status(500).json({error:'Failed to start game'});
  }
});

router.post('/reveal',authenticate,async function(req,res){
  try{
    await ensureSchema();
    var userId=req.user.id;
    var tileIndex=parseInt(req.body.tileIndex,10);  // UI sends "tileIndex"
    if(isNaN(tileIndex)||tileIndex<0||tileIndex>24){
      return res.status(400).json({error:'tileIndex must be 0-24'});
    }
    var game=await db.get(
      'SELECT * FROM mines_games WHERE user_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1',
      [userId]
    );
    if(!game){return res.status(404).json({error:'No active game found'});}
    var minePositions=JSON.parse(game.mine_positions);
    var revealed=JSON.parse(game.revealed);
    if(revealed.indexOf(tileIndex)!==-1){
      return res.status(400).json({error:'Tile already revealed'});
    }
    // Hit a mine
    if(minePositions.indexOf(tileIndex)!==-1){
      await db.run(
        'UPDATE mines_games SET status = \'busted\', payout = 0 WHERE id = ?',
        [game.id]
      );
      return res.json({success:true,result:'mine',minePositions:minePositions,payout:0,newBalance:null});
    }
    // Safe tile
    revealed.push(tileIndex);
    var gemTiles=GRID_SIZE-game.mines_count;
    var multiplier=calcMultiplier(revealed.length,game.mines_count);
    var payout=parseFloat((game.bet*multiplier).toFixed(2));
    // Auto-win: all gem tiles uncovered
    if(revealed.length>=gemTiles){
      await db.run(
        'UPDATE mines_games SET revealed = ?, status = \'won\', payout = ? WHERE id = ?',
        [JSON.stringify(revealed),payout,game.id]
      );
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?',[payout,userId]);
      var autoProfit=parseFloat((payout-game.bet).toFixed(2));
      if(autoProfit>0){
        await db.run(
          'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, \'win\', ?, ?)',
          [userId,autoProfit,'Mines: auto-win '+multiplier.toFixed(2)+'x']
        ).catch(function(){});
      }
      var winUser=await db.get('SELECT balance FROM users WHERE id = ?',[userId]);
      return res.json({success:true,result:'safe',revealed:revealed,multiplier:multiplier,payout:payout,gameOver:true,autoWin:true,newBalance:winUser?parseFloat(winUser.balance):null});
    }
    await db.run(
      'UPDATE mines_games SET revealed = ? WHERE id = ?',
      [JSON.stringify(revealed),game.id]
    );
    return res.json({success:true,result:'safe',revealed:revealed,multiplier:multiplier,payout:payout,gameOver:false});
  }catch(err){
    console.error('[mines] POST /reveal error:',err.message);
    return res.status(500).json({error:'Failed to reveal tile'});
  }
});

router.post('/cashout',authenticate,async function(req,res){
  try{
    await ensureSchema();
    var userId=req.user.id;
    var game=await db.get(
      'SELECT * FROM mines_games WHERE user_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1',
      [userId]
    );
    if(!game){return res.status(404).json({error:'No active game found'});}
    var revealed=JSON.parse(game.revealed);
    var minePositions=JSON.parse(game.mine_positions);
    var multiplier=calcMultiplier(revealed.length,game.mines_count);
    var payout=parseFloat((game.bet*multiplier).toFixed(2));
    await db.run(
      'UPDATE mines_games SET status = \'cashed_out\', payout = ? WHERE id = ?',
      [payout,game.id]
    );
    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?',[payout,userId]);
    var profit=parseFloat((payout-game.bet).toFixed(2));
    if(profit>0){
      await db.run(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, \'win\', ?, ?)',
        [userId,profit,'Mines: cashed out '+multiplier.toFixed(2)+'x ('+revealed.length+' gems)']
      ).catch(function(){});
    }
    var updatedUser=await db.get('SELECT balance FROM users WHERE id = ?',[userId]);
    var newBalance=updatedUser?parseFloat(updatedUser.balance):null;
    return res.json({success:true,payout:payout,multiplier:multiplier,minePositions:minePositions,newBalance:newBalance});
  }catch(err){
    console.error('[mines] POST /cashout error:',err.message);
    return res.status(500).json({error:'Failed to cash out'});
  }
});

module.exports=router;
