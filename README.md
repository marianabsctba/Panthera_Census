# Panthera Census

O censo aberto do ransomware: o mundo inteiro, com o Brasil revisado à mão e nenhuma vítima identificada, para consulta e para uso em aula.

## O que tem

- **Mapa-múndi** por período, desde 2013, com filtro por setor e medida por alegações, por habitante e por PIB.
- **Brasil e mundo** por setor, com a revisão dos casos brasileiros e margem de incerteza.
- **Tempo:** mês a mês, dia da semana e demora até a alegação aparecer.
- **O que eles alegam:** faixas de volume de dados, faturamento, funcionários, tipos de dado citados e situação da negociação, lidas do texto dos próprios criminosos.
- **Grupos:** perfil de mais de 300 grupos, com RaaS, linhagem, grupos novos por ano, sites no ar, setores, países, ferramentas e vulnerabilidades.
- **Como atacam:** ferramentas e CVEs usados por mais grupos.
- **ANPD:** comunicações oficiais por ano, tipo, segmento, estado e setor, sempre separadas das alegações.

Tudo o que aparece aqui é **alegação de criminoso em site de vazamento, não incidente confirmado**. Quem paga o resgate tende a não aparecer, então a base mostra só uma parte dos ataques.

## Como funciona

- Site estático, sem servidor, sem login e sem chave de acesso, publicado no GitHub Pages. A consulta roda no navegador.
- Um GitHub Action roda todo dia, baixa as bases públicas e calcula os números somados. Se uma fonte complementar cair, só aquela seção fica vazia naquele dia.
- Endereços `.onion`, contatos e carteiras de grupos não entram, mesmo estando nas fontes. Cada perfil de grupo aponta para as fichas públicas dele no Ransomware.live e no RansomLook, onde quem pesquisa encontra os endereços, e para relatórios de fontes conhecidas.
- **O dado bruto nunca entra no repositório nem no site.** Ele existe só na memória da execução do Action. Os logs são públicos e não imprimem registro nenhum.
- `scripts/trava.mjs` barra a publicação se aparecer texto que não seja nome de grupo, país, setor, ferramenta, data ou rótulo conhecido, se um recorte tiver menos de 3 casos, se um arquivo versionado citar o site de uma vítima ou se a fonte vier cortada. Nesse caso, o site fica com os números do dia anterior.
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
- Grupos: `groups.json` do Ransomware.live. Totais do ecossistema: [RansomLook](https://www.ransomlook.io), sob CC BY 4.0.
- Ferramentas e vulnerabilidades: [Ransomware Tool Matrix](https://github.com/BushidoUK/Ransomware-Tool-Matrix) e [Ransomware Vulnerability Matrix](https://github.com/BushidoUK/Ransomware-Vulnerability-Matrix), de BushidoUK, sob CC BY 4.0.
- População e PIB: [Banco Mundial](https://data.worldbank.org), sob CC BY 4.0, em `curadoria/referencias.json`. Atualize com `node scripts/referencias.mjs`.
- Comunicações de incidente: [painéis públicos da ANPD](https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca), lidos dos painéis e guardados em `curadoria/anpd.json`. Não se atualizam sozinhos e nunca são somados às alegações.
- Contornos do mapa: [Natural Earth](https://www.naturalearthdata.com/), via [world-atlas](https://github.com/topojson/world-atlas).

## Licença

Código sob GPL-3.0-or-later. Os números somados seguem os termos da fonte: uso não comercial e crédito ao Ransomware.live.
