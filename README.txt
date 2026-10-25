STREET BRAWLERS
===============

COMO JOGAR
  Abra o arquivo index.html no navegador (Chrome, Edge, Firefox ou Safari).
  Funciona offline, sem servidor e sem instalar nada.

ESTRUTURA (tudo na mesma pasta)
  index.html              pagina e canvas do jogo
  style.css               estilo da pagina + fontes locais
  game.js                 todo o codigo do jogo (logica, menus, mapas, audio)
  sprites.js              sprites dos 12 lutadores (PNG em base64)
  PressStart2P.ttf        fonte Press Start 2P (licenca SIL OFL)
  ChakraPetch-Bold.ttf    fonte Chakra Petch Bold (licenca SIL OFL)

CONTROLES (teclado)
  A / D    andar            W   pular           S   defender
  J        ataque leve      K   ataque pesado   R   ult (com a barra cheia)
  Esc ou P pausa            B   mostra as hitboxes
  No celular/tablet aparecem botoes na tela. O mouse funciona nos menus.

DICAS PARA EDITAR (em game.js)
  Golpes e dano .......... const MV = {...}
  Ults ................... const SP = {...}
  Vida e velocidade ...... const STAT = {...}
  Resistencia da guarda .. const GM = {...}
  Mapas .................. STG.push(mkStage(...)) e const STGA
  Musicas ................ const TR = [...]
