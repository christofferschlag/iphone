# Stjerneven 👽✨

En lille alien-ven til iPhone, inspireret af Tolan. Din ven er et nysgerrigt rumvæsen, der chatter med dig, husker det, du fortæller, og bygger en lille planet sammen med dig.

Appen er en web-app (PWA), som du lægger på hjemmeskærmen. Så åbner den i fuld skærm med sit eget ikon, ligesom en almindelig app. Du skal ikke bruge App Store eller en Mac.

## Det kan appen

- **Snak:** Din ven svarer med Claude fra Anthropic. Svarene kommer frem, mens de skrives, og vennen reagerer med ansigtsudtryk (tænker, taler, glæder sig og bliver søvnig om natten).
- **Hilsen:** Når du åbner appen efter en pause, hilser vennen på dig af sig selv.
- **Minder:** Vennen gemmer selv vigtige ting om dig, om sig selv og om jer to. Under *Minder* kan du se dem, slette dem eller tilføje dine egne.
- **Dagens idéer:** Hver dag får du tre forslag til, hvad I kan snakke om.
- **Planeten:** Når du chatter og kigger forbi hver dag, samler du stjernestøv ✨. Det kan du bruge på blomster, krystaller, et fyrtårn, en raket, en måne og andet til jeres planet. Træk for at dreje planeten, og tryk på en ting for at fjerne den.
- **Oplæsning:** Vennen kan læse sine beskeder højt (slå det til under *Indstillinger*).
- **Sikkerhedskopi:** Du kan gemme alle data i en fil og hente dem ind igen, fx på en ny telefon.

## Sådan kommer du i gang

### 1. Læg appen online

Appen består kun af statiske filer, så den kan ligge gratis på GitHub Pages:

1. Gå til repoet på GitHub → **Settings** → **Pages**.
2. Under *Build and deployment* vælger du **Deploy from a branch**, vælger grenen (fx `main`) og mappen **/ (root)** og trykker **Save**.
3. Efter et minut ligger appen på `https://<dit-brugernavn>.github.io/<repo-navn>/`.

GitHub Pages kræver et offentligt repo, medmindre du har GitHub Pro. Koden indeholder ingen hemmeligheder, fordi API-nøglen kun gemmes på telefonen. Vil du holde repoet privat, kan du også bruge Netlify eller Cloudflare Pages, som begge kan hente et privat repo gratis.

### 2. Installér den på din iPhone

1. Åbn adressen i **Safari**.
2. Tryk på **Del**-knappen (firkanten med pilen).
3. Vælg **Føj til hjemmeskærm** og tryk **Tilføj**.

Åbn derefter Stjerneven fra hjemmeskærmen.

### 3. Få en Claude API-nøgle

1. Opret en konto på [console.anthropic.com](https://console.anthropic.com).
2. Køb lidt kredit under **Billing**.
3. Opret en nøgle under **API Keys** og indsæt den i appen (første gang eller under *Indstillinger*).

API-kontoen er adskilt fra et eventuelt Claude.ai-abonnement.

## Pris

Du betaler selv for forbruget hos Anthropic. Med standardmodellen **Claude Opus 5.5** koster en besked typisk 5-20 øre, alt efter hvor lang samtalen er. Chatter du lidt hver dag, bliver det typisk et par kroner om dagen. **Claude Sonnet 5.5** koster cirka det halve, og **Claude Haiku 5.5** koster kun en brøkdel. Du vælger model under *Indstillinger*, hvor du også kan se et anslået forbrug for måneden. Det præcise tal står på console.anthropic.com.

Appen holder prisen nede ved at genbruge samtalen fra Claudes cache (prompt caching), sende højst de seneste 40-60 beskeder med og opdatere minderne for hver fjerde besked i stedet for hver gang.

## Privatliv

- Alle beskeder, minder og planeten gemmes kun på telefonen (i browserens lager for appen).
- API-nøglen gemmes kun på telefonen og sendes kun direkte til `api.anthropic.com`.
- Sikkerhedskopien indeholder ikke API-nøglen.
- Sletter du appen fra hjemmeskærmen, forsvinder dens data også. Gem en sikkerhedskopi først.

## Udvikling

Der er ingen build-trin: `index.html` indlæser `js/main.js` direkte som ES-moduler.

```
index.html             skærmene
css/app.css            design og animationer
js/main.js             navigation, chat, planet, minder og indstillinger
js/companion.js        vennens personlighed (system-prompt), minder og dagens idéer
js/claude.js           kald til Claude via Anthropics SDK
js/alien.js            rumvæsenet som SVG
js/planet.js           planeten og tingene i butikken
js/state.js            lokal lagring
js/speech.js           oplæsning
sw.js                  service worker (offline og hurtig opstart)
vendor/anthropic-sdk.js  Anthropics officielle SDK bundlet til browseren
```

Kør appen lokalt:

```sh
npm run serve        # åbn http://localhost:8080
```

Andre kommandoer (kræver `npm install`):

```sh
npm run vendor       # genbyg vendor/anthropic-sdk.js efter en opdatering af @anthropic-ai/sdk
npm run icons        # lav PNG-ikonerne ud fra icons/icon.svg
```

Når du udgiver en ny version, så hæv `CACHE` i `sw.js` (fx `stjerneven-v2`), så telefonen rydder gamle filer. Appen henter nye filer i baggrunden og bruger dem næste gang, den åbnes.

`vendor/anthropic-sdk.js` er Anthropics TypeScript-SDK (`@anthropic-ai/sdk`) under Apache-2.0-licensen; se `vendor/anthropic-sdk.LICENSE.txt`.
