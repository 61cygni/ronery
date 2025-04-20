# ronery

## Quick Start Run

```
./install.sh -f ../path/to/forge-internal/
npm run dev
```

## Quick Start Build

```
./build.sh -f ../path/to/forge-internal/
```

## To Connect the Bartender to AI 

You'll need a braintrust account [https://www.braintrust.dev/]. The app currently uses grok2 so you'll want to set that up within braintrust. 

Then

```
npx braintrust push --api-key API_KEY braintrust/cozytavern.ts
```

Double check that the prompt was set from the braintrust dashboard. Then add a .env file to the project root directory with your braintrust API key:

```
VITE_BRAINTRUST_API_KEY=<KEY>
```