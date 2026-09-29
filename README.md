# BESS Doku

Puzzle de lógica do Lulu da Pomerânia (estilo Star Battle): coloque um Lulu por linha, coluna e região, sem dois Lulus se tocarem. Modos Solo, Duelo local e Desafio Diário.

Feito em HTML, CSS e JavaScript puros, sem servidor. Funciona offline como PWA.

## Como jogar

- **Toque** numa casa para marcar ✕ (aparece na hora); toque de novo para desmarcar.
- **Arraste** o dedo pelo tabuleiro para marcar ✕ em várias casas vazias de uma vez.
- **Toque duas vezes rápido** numa casa para colocar o personagem (ou removê-lo).

## Jogar / instalar no Android

1. Abra **https://giovannimilani1612-cloud.github.io/bessdoku/** no Chrome do tablet ou celular.
2. Menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
3. O ícone aparece na tela inicial e o jogo abre em tela cheia, mesmo sem internet.

## Atualizar o jogo publicado

1. Edite os arquivos e aumente `CACHE_NAME` em `sw.js` (ex.: `bessdoku-v1` → `bessdoku-v2`).
2. `git add -A && git commit -m "..." && git push`.
3. O GitHub Pages republica em 1–2 minutos; o app instalado pega a versão nova na próxima abertura.
