<pre>

___  ___       ______       _ _                         
|  \/  |       |  ___|     | (_)                        
| .  . |_   _  | |_ ___  __| |___   _____ _ __ ___  ___ 
| |\/| | | | | |  _/ _ \/ _` | \ \ / / _ \ '__/ __|/ _ \
| |  | | |_| | | ||  __/ (_| | |\ V /  __/ |  \__ \  __/
\_|  |_/\__, | \_| \___|\__,_|_| \_/ \___|_|  |___/\___|
         __/ |                                          
        |___/                                           
  
</pre>

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```sh
git clone https://github.com/chewingumex/myFediverse.git
cd myFediverse
npm install
npm run dev
```

This starts both the frontend and the backend search proxy together, then open **http://localhost:5173**.

- **Atlas tab** — browses public instance directories (Mastodon, PeerTube, Lemmy, Pixelfed), no setup needed.
- **Search tab** — fans a search term out across a small set of seed instances per content type. Requires the backend proxy, which `npm run dev` already starts for you.

If you'd rather run the two processes separately (e.g. for debugging one independently):

```sh
npm run dev:web   # frontend only, http://localhost:5173
npm run dev:api   # backend search proxy only, http://localhost:8787
```

Search sources are configured in `server/seeds.js` — add or swap instances there.
