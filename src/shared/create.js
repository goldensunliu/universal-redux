import { map } from 'lodash';
import createLogger from 'redux-logger';

// TODO: parameterize react-router
import { syncHistory } from 'react-router-redux';
import { browserHistory } from 'react-router';
import useScroll from 'scroll-behavior/lib/useStandardScroll';

import createMemoryHistory from 'react-router/lib/createMemoryHistory';

import { compose, applyMiddleware, createStore } from 'redux';

// explicit path required for HMR to function. see #7
import reducers from '../../../../../src/redux/modules';

function hmr(store) {
  if (module.hot) {
    module.hot.accept('../../../../../src/redux/modules', () => {
      const nextRootReducer = require('../../../../../src/redux/modules/index').default;
      store.replaceReducer(nextRootReducer);
    });
  }
}

export default function create(providedMiddleware, data, req) {
  // TODO: parameterize react-router
  let router;
  if (__CLIENT__) {
    router = syncHistory(useScroll(() => browserHistory)());
  } else {
    router = syncHistory(createMemoryHistory());
  }

  const defaultMiddleware = [ router ];

  // backward compatibility to 2.x api expecting object for middleware instead of array:
  const customMiddleware = !providedMiddleware.concat ? map(providedMiddleware, (m) => { return m; }) : providedMiddleware;

  let middleware = customMiddleware.concat(defaultMiddleware);

  // if (__CLIENT__ && __LOGGER__) {
  //   middleware.push(createLogger({ collapsed: true }));
  // }

  // Add express request as a 2nd argument to the middlewares
  if (__SERVER__) {
    middleware = middleware.map((fn) => function (obj) {
      return fn.call(this, obj, req);
    });
  }

  const devtoolsExtensionMiddleware = () =>
    __CLIENT__ &&
    typeof window === 'object' &&
    typeof window.devToolsExtension === 'function'
    ? window.devToolsExtension() : f => f

  // const useDevtools = __DEVELOPMENT__ && __CLIENT__ && __DEVTOOLS__;
  const finalCreateStore = compose(
    applyMiddleware(...middleware),
    devtoolsExtensionMiddleware()
  )(createStore)

  const store = finalCreateStore(reducers, data);

  hmr(store);

  return store;
}
