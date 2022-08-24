# Plugins

Develop plugins for fiftyone.

## Installing plugins

In order to install a plugin you must have one of the two tools available in the environment you are running fiftyone.

- npm
- yarn

Create a directory where you want to store your plugins. Note: this directory must be readable by the fiftyone server.

When running fiftyone, you must specify the location of the plugin directory using the `FIFTYONE_PLUGINS_DIR`.

Once you have a plugins directory setup, you must create a shell package to version your plugins.

```
cd $FIFTYONE_PLUGINS_DIR
yarn init # or npm init
```

Now you can install a node package that contains a plugin.

```
# if it is avaialable on plubic/private npm registry
yarn add my-fiftyone-plugin
# or with npm
npm install my-fiftyone-plugin --save
```

If your plugin is only available in a git repository, you can still install via git, although the environment must be configured to allow reading from that git repository.

```
# install via a github http url
yarn add my-plugin@https://github.com/user/my-plugin.git#my-branch-name

# install via ssh/repo
yarn add ssh://github.com/user/my-plugin#my-branch
```

## Configuring plugins

In your `FIFTYONE_PLUGINS_DIR`, create a file named `settings.json`. Each top level property in this file corresponds to the
name (package.json "name") of one of your installed plugins.

Each plugin should describe what settings it supports. All plugins share the "enabled" setting. If set to `false` the
plugin will not be loaded.

Below is an example `settings.json` file.

```json
{
  "3d": {
    "enabled": true,
    "defaultCameraPosition": { "x": 0, "y": 0, "z": 20 }
  }
}
```

## Developing your Plugin

In order to develop and test your plugin you will need the following:

- a development install of fiftyone
- the fiftyone app setup for development
- a plugin skeleton (start with one of the plugins in voxel51/fiftyone-plugins)
- npm link / symlink to the `@fiftyone/plugins` package
- npm link / symlink to the `@fiftyone/aggregations` package (optional)

For local testing, follow these basic steps:

First ensure your plugin's `package.json` includes the path to the plugin script:

```json
  "fiftyone": {
    "script": "dist/index.umd.js"
  }
```

Then follow the steps below, in separate terminal sessions as needed.

```sh
# tell fiftyone where you want to load plugins from
# this should be a parent directory to all your plugins
FIFTYONE_PLUGINS_DIR=$MY_PLUGINS_DIR

# start the fiftyone app in dev mode
cd $FIFTYONE/app/packaages/app
yarn dev

# start the fiftyone python server (in a separate session)
cd $FIFTYONE
python fiftyone/server/main.py

# ensure your plugin has a symlink to the @fiftyone/plugins package
cd $FIFTYONE/app/packaages/plugins
npm link
cd $MY_PLUGIN
npm link @fiftyone/plugins

# note: if you are using the @fiftyone/aggregations package
# you will need to follow the same linking steps for that package

# now you can build your plugin for development
yarn build
```

You should now have a running fiftyone server and app, including your plugin.

NOTE: each time you change you plugin's source you must rebuild using `yarn build`. You can setup a watcher to do this automatically (see: [nodemon](https://www.npmjs.com/package/nodemon)).

## Publishing your plugin

You can publish your plugin to either a public/private npm registry,
or a git repository. Including your package.json and built (dist) files is required for both. No other files are required to be published with your plugin.

Before publishing make sure you do the following:

- login to the registry you are trying to publish to
- OR use a .npmrc to include private registry credentials
- have the correct name, version, etc in your package.json
- have a built plugin `dist` directory
- your package.json points to the plugin entry point

Then to publish your latest plugin to an npm registry:

```
# using yarn
yarn publish
# using npm
```

If you are using a git repository to publish your plugins,
you must ensure that you include the `dist` directory when
pushing to the remote repo.

## How to write Plugins

Below are introductory examples to the fiftyone plugin api.

### Hello World

A simple hello world plugin, that renders "hello world" in place of the plots main content area, would look like this:

```jsx
import { registerComponent, PluginComponentTypes } from "@fiftyone/plugins";

function HelloWorld() {
  return <h1>Hello World</h1>;
}

registerComponent({
  copmponent: HelloWorld,
  type: PluginComponentTypes.Plot,
});
```

Installing the plugin above would require building a bundle JS file and placing in a directory with a `package.json` file.

The fiftyone python server will then detect this as an installed plugin and the app will load it and render it.

### Adding a custom Fiftyone Visualizer

```jsx
import * as fop from "@fiftyone/plugins";
import * as fos from "@fiftyone/visualizer";

function PointCloud({ src }) {
  // TODO: implement your visualizer using React
}

// this separate components shows where the fiftyone plugin
// dependent code ends and the pure react code begins
function CustomVisualizer({ sample }) {
  const src = fos.getSampleSrc(sample.filepath);
  // now that we have all the data we need
  // we can delegate to code that doesn't depend
  // on the fiftyone plugin api
  return <PointCloud src={src} />;
}

fop.registerComponent({
  // component to delegate to
  copmponent: CustomVisualizer,
  // tell fiftyone you want to provide a Visualizer
  type: PluginComponentTypes.Visualizer,
  // activate this plugin when the mediaType is PointCloud
  activator: ({ dataset }) => dataset.mediaType === "PointCloud",
});
```

### Adding a custom Plot

```jsx
import * as fop from "@fiftyone/plugins";
import * as fos from "@fiftyone/plugins";
import * as foa from "@fiftyone/aggregations";
import AwesomeMap from "react-mapping-library";

function CustomPlot() {
  const dataset = useRecoilValue(fos.dataset);
  const view = useRecoilValue(fos.view);
  const filters = useRecoilValue(fos.filters);
  const [aggregate, points, loading] = foa.useAggregation({
    dataset,
    filters,
    view,
  });

  React.useEffect(() => {
    aggregate(
      [
        new foa.aggregations.Values({
          fieldOrExpr: "id",
        }),
        new foa.aggregations.Values({
          fieldOrExpr: "location.point.coordinates",
        }),
      ],
      dataset.name
    );
  }, [dataset, filters, view]);

  if (loading) return <h1>Loading</h1>;

  return <MyMap geoPoints={points} />;
}

fop.registerComponent({
  // component to delegate to
  copmponent: CustomPlot,
  // tell fiftyone you want to provide a custom Plot
  type: PluginComponentTypes.Plot,
  // used for the plot selector button
  label: "Map",
  // only show the Map plot when the dataset has Geo data
  activator: ({ dataset }) => dataset.sampleFields.location,
});
```

### Reacting to State Changes

```tsx
import * as fos from '@fiftyone/state'
import * as recoil from 'recoil'

// this example demonstrates handling updates to
// filters/sidebar, but applies to everything
// listed under "state" below
function MyPlugin() {
  const activeFields = recoil.useRecoilValue(fos.activeFields)

  return <ul>{activeFields.map(f => <li>{f.name}</li>)}
}
```

### Interactivity and State

If your plugin only has internal state, you can use existing state management to achieve your desired ux. Eg. in a 3d Visualizer, you might want to use Thee.js and its object model, events, and state management. Or just use your own React hooks to maintain your plugin components internal state.

If you want to allow users to interact with other aspects of fiftyone through your plugin, you can use the `@fiftyone/state` package.

```jsx
// note: similar to react hooks, these must be used in the context
// of a React component

// select a dataset
const selectLabel = fos.useOnSelectLabel();

// in a callback
selectLabel({ id: "labelId", field: "fieldName" });
```

## Reading Settings in Your Plugin

Somme plugins use libraries or tools that require credentials such as API keys or tokens. Below is an example for how to provide and read these credentials.

The same mechanism can be used to expose configuration to plugin users, such as color choices, and default values.

You can store your credentials in your plugin settings located at `FIFTYONE_PLUGINS_DIR/settings.json`:

```json
{
  "my-map-box-plugin": {
    "mapboxAPIKey": "..."
  }
}
```

Then in your plugin implementation, you can read settings with the `useSettings` hook:

```js
const { mapboxAPIKey } = fop.useSettings("my-map-box-plugin");
```

## Querying Fiftyone

The typical use case for a plugin is to provide a unique way of visualizing fiftyone data. However some plugins may need to also fetch data in a unique way to efficiently visualize it.

For example, a `PluginComponentType.Plot` plugin rendering a map of geo points may need to fetch data relative to where the user is currently viewing. In mongodb, such a query would look like this:

```js
{
  $geoNear: {
    near: { type: "Point", coordinates: [ -73.99279 , 40.719296 ] },
    maxDistance: 2,
    query: { category: "Parks" },
  }
}
```

In a fiftyone plugin this same query can be performed using the `useAggregation()` method of the plugin sdk.

```js
import * as fop from "@fiftyone/plugins";
import * as fos from "@fiftyone/state";
import * as foa from "@fiftyone/aggregations";
import * as recoil from "recoil";

function useGeoDataNear() {
  const dataset = useRecoilValue(fos.dataset);
  const view = useRecoilValue(fos.view);
  const filters = useRecoilValue(fos.filters);
  const [aggregate, points, isLoading] = foa.useAggregation({
    dataset,
    filters,
    view,
  });
  const availableFields = findAvailableFields(dataset.sampleFields);
  const [selectedField, setField] = React.useState(availableFields[0]);

  React.useEffect(() => {
    aggregate([
      new foa.aggregations.Values({
        fieldOrExpr: "location.point.coordinates",
      }),
    ]);
  }, []);

  return {
    points,
    isLoading,
    setField,
    availableFields,
    selectedField,
  };
}

function MapPlugin() {
  const { points, isLoading, setField, availableFields, selectedField } =
    useGeoDataNear();

  return (
    <Map
      points={points}
      onSelectField={(f) => setField(f)}
      selectedField={selectedField}
      locationFields={availableFields}
    />
  );
}

fop.registerComponent({
  name: "MapPlugin",
  label: "Map",
  activator: ({ dataset }) => findAvailableFields(dataset.fields).length > 0,
});
```