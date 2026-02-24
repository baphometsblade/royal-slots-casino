
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

content = open(os.path.join(os.path.dirname(__file__), '_v2_content.txt'), encoding='utf-8').read()
out = os.path.join(os.path.dirname(__file__), 'generate_animated_symbols_v2.py')
open(out, 'w', encoding='utf-8').write(content)
print('Written', len(content), 'bytes to', out)
