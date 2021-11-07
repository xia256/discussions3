# Discussiosn 3.0

## Client setup
```
npm install
```

To connect to the discussions.app backend, you must create a file `./src/server/config.secret.json` with the following:
```
{
    "$public": {
        "url": "https://discussions.app"
    }
}
```

### Compiles and hot-reloads for development
```
npm run serve
```

You will then be able to access the local interface on http://localhost:8080/

## Server setup

...