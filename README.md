# Panthera Census

O censo aberto do ransomware: o mundo inteiro, com o Brasil revisado à mão e nenhuma vítima identificada. Mapa-múndi, setores, grupos e comparação entre o Brasil e o mundo, para consulta e para uso em aula.

Tudo o que aparece aqui é **alegação de criminoso em site de vazamento, não incidente confirmado**. Quem paga o resgate tende a não aparecer, então a base mostra só uma parte dos ataques.

## Como funciona

- Site estático, sem servidor, sem login e sem chave de acesso, publicado no GitHub Pages. A consulta roda no navegador.
- Um GitHub Action roda todo dia, baixa a base pública do [Ransomware.live](https://www.ransomware.live) e calcula os números somados.
- **O dado bruto nunca entra no repositório nem no site.** Ele existe só na memória da execução do Action. Os logs são públicos e não imprimem registro nenhum.
- `scripts/trava.mjs` barra a publicação se aparecer texto que não seja nome de grupo, país, setor ou data, se um recorte tiver menos de 3 casos, se um arquivo versionado citar o site de uma vítima ou se a fonte vier cortada. Nesse caso, o site fica com os números do dia anterior.
- `historico/resumo.csv` guarda só os totais de cada dia.

## Anonimização

- Países, setores, grupos e trimestres com menos de 3 casos são somados ou omitidos.
- Nomes, sites e links de vítimas ficam de fora.
- As fontes são públicas, então isso reduz a exposição, mas não torna a identificação impossível para quem for procurar o caso original. Por isso falamos em anonimizado na publicação, não em anonimato absoluto.

## A revisão do Brasil

A fonte erra país e setor. Por isso, os casos marcados como Brasil são lidos um a um, e a revisão decide se o caso fica, se é de outro país, se é repetição ou se muda de setor.

`curadoria/correcoes.json` guarda só o código de cada caso, um HMAC do grupo e do título feito com o segredo `CENSUS_SEGREDO`, e a decisão. Sem o segredo, não dá para descobrir a empresa testando nomes. A planilha com os nomes fica fora do repositório, com quem revisa.

O custo dessa escolha é que ninguém de fora consegue conferir cada correção. Dá para repetir tudo o que vem da fonte e ver quantas correções foram feitas e qual o efeito delas. Hoje a revisão teve uma única leitura, ainda sem segunda checagem, e os demais países seguem como vieram da fonte.

Para atualizar a revisão:

```bash
CENSUS_SEGREDO=... npm run curadoria -- caminho/da/revisao.json
```

Cada linha da planilha tem `group_name`, `post_title`, `acao` (`ok`, `estrangeiro`, `duplicata` ou `setor`) e, quando a ação é `setor`, o novo `setor`.

## Rodar

```bash
npm ci
npm run dados
npm test
npm run build
npm run preview
```

Sem o `CENSUS_SEGREDO`, o Brasil sai como veio da fonte.

## Dados e créditos

- Alegações, país e setor: [Ransomware.live](https://www.ransomware.live), de Julien Mousqueton, com uso não comercial e atribuição. Os dados brutos não são republicados aqui, como pedem os [termos](https://www.ransomware.live/t&c).
- Comunicações de incidente: [painéis públicos da ANPD](https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca), transcritos à mão em `curadoria/anpd.json`. Nunca são somados às alegações.
- Contornos do mapa: [Natural Earth](https://www.naturalearthdata.com/), via [world-atlas](https://github.com/topojson/world-atlas).

## Licença

Código sob GPL-3.0-or-later. Os números somados seguem os termos da fonte: uso não comercial e crédito ao Ransomware.live.
