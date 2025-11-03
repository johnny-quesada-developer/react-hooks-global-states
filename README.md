# react-hooks-global-states 🌟

![Image John Avatar](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

Effortless **global state management** for `React` & `React Native` & `Preact`! 🚀 Define a **global state in just one line of code** and enjoy **lightweight, flexible, and scalable** state management. Try it now on **[CodePen](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)** and see it in action! ✨

---

## 🔗 Explore More

- **[Live Example](https://johnny-quesada-developer.github.io/global-hooks-example/)** 📘
- **[Video Overview](https://www.youtube.com/watch?v=1UBqXk2MH8I/)** 🎥
- **[react-hooks-global-states](https://www.npmjs.com/package/react-hooks-global-states)** compatible with both `React & React Native`
- **[react-global-state-hooks](https://www.npmjs.com/package/react-global-state-hooks)** specific for web applications (**local-storage integration**).
- **[react-native-global-state-hooks](https://www.npmjs.com/package/react-native-global-state-hooks)** specific for React Native projects (**async-storage integration**).

---

## 🚀 React Hooks Global States - DevTools Extension

React Hooks Global States includes a dedicated, `devTools extension` to streamline your development workflow! Easily visualize, inspect, debug, and modify your application's global state in real-time right within your browser.

### 🔗 [Install the DevTools Extension for Chrome](https://chromewebstore.google.com/detail/bafojplmkpejhglhjpibpdhoblickpee/preview?hl=en&authuser=0)

### 📸 DevTools Highlights

| **Track State Changes**                                                                                                               | **Modify the State**                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ![Track State Changes](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/track-state-changes.png) | ![Modify the State](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/modify-the-state.png) |
| Effortlessly monitor state updates and history.                                                                                       | Instantly edit global states directly from the extension.                                                                       |

---

| **Restore the State**                                                                                                             | **Custom Actions Granularity**                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Restore the State](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/restore-the-state.png) | ![Custom Actions Granularity](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/custom-actions-granularity.png) |
| Quickly revert your application to a previous state.                                                                              | Precisely debug specific actions affecting state changes.                                                                                           |

<br>

## 🛠 Creating a Global State

Define a **global state** in **one line**:

```tsx
import createGlobalState from 'react-hooks-global-states/createGlobalState';
export const useCount = createGlobalState(0);
```

Now, use it inside a component:

```tsx
const [count, setCount] = useCount();
return <Button onClick={() => setCount((count) => count + 1)}>{count}</Button>;
```

Works just like **useState**, but the **state is shared globally**! 🎉

---

## 🎯 Selectors: Subscribing to Specific State Changes

For **complex state objects**, you can subscribe to specific properties instead of the entire state:

```tsx
export const useContacts = createGlobalState({ entities: [], selected: new Set<number>() });
```

To access only the `entities` property:

```tsx
const [contacts] = useContacts((state) => state.entities);
return (
  <ul>
    {contacts.map((contact) => (
      <li key={contact.id}>{contact.name}</li>
    ))}
  </ul>
);
```

### 📌 Using Dependencies in Selectors

You can also add **dependencies** to a selector. This is useful when you want to derive state based on another piece of state (e.g., a filtered list). For example, if you're filtering contacts based on a `filter` value:

```tsx
const [contacts] = useContacts(
  (state) => state.entities.filter((item) => item.name.includes(filter)),
  [filter],
);
```

Alternatively, you can pass dependencies inside an **options object**:

```tsx
const [contacts] = useContacts((state) => state.entities.filter((item) => item.name.includes(filter)), {
  dependencies: [filter],
  isEqualRoot: (a, b) => a.entities === b.entities,
});
```

Unlike Redux, where only **root state changes trigger re-selection**, this approach ensures that **derived values recompute when dependencies change** while maintaining performance.

---

## 🔄 Reusing Selectors

### 📌 Creating a Selector

```tsx
export const useContactsArray = useContacts.createSelectorHook((state) => state.entities);
export const useContactsCount = useContactsArray.createSelectorHook((entities) => entities.length);
```

### 📌 Using Selectors in Components

```tsx
const [contacts] = useContactsArray();
const [count] = useContactsCount();
```

#### ✅ Selectors support inline selectors and dependencies

You can still **use dependencies** inside a selector hook:

```tsx
const [filteredContacts] = useContactsArray(
  (contacts) => contacts.filter((c) => c.name.includes(filter)),
  [filter],
);
```

#### ✅ Selector hooks share the same state mutator

The **state api is stable across renders** meaning actions and setState functions stay consistent.

```tsx
const [, setState1] = useContactsArray();
const [contacts] = useContactsCount();

console.log(setState1 === useContacts.setState); // true
```

---

## 🎛 State Actions: Controlling State Modifications

Restrict **state modifications** by defining custom actions:

```tsx
export const useContacts = createGlobalState(
  { filter: '', items: [] },
  {
    actions: {
      async fetch() {
        return async ({ setState }) => {
          const items = await fetchItems();
          setState({ items });
        };
      },
      setFilter(filter: string) {
        return ({ setState }) => {
          setState((state) => ({ ...state, filter }));
        };
      },
    },
  },
);
```

Now, instead of `setState`, the hook returns **actions**:

```tsx
const [filter, { setFilter }] = useContacts();
```

---

## 🌍 Accessing Global State Outside Components

You can access and manipulate global without hooks, useful for non-component code like services or utilities.
Or for non reactive components.

```tsx
console.log(useContacts.getState()); // Retrieves the current state
```

#### ✅ Subscribe to changes

```tsx
const unsubscribe = useContacts.subscribe((state) => {
  console.log('State updated:', state);
});
```

#### ✅ Subscriptions are great when one state depends on another.

```tsx
const useSelectedContact = createGlobalState(null, {
  callbacks: {
    onInit: ({ setState, getState }) => {
      useContacts.subscribe(
        (state) => state.contacts,
        (contacts) => {
          if (!contacts.has(getState())) setState(null);
        },
      );
    },
  },
});
```

---

## 🎭 Using Context for Scoped State

- **Scoped State** – Context state is **isolated inside the provider**.
- **Same API** – Context supports **selectors, actions, and state controls**.

### 📌 Creating a Context

```tsx
import createContext from 'react-global-state-hooks/createContext';

export const counter = createContext(0);

export const App = () => {
  return (
    <counter.Provider>
      <MyComponent />
    </counter.Provider>
  );
};

export const Component = () => {
  const [count, setCount] = counter.use();

  return <Button onClick={() => setCount((c) => c + 1)}>{count}</Button>;
};

export const Component2 = () => {
  const [count, setCount] = counter.use.api(); // non reactive access to the context api

  return <Button onClick={() => setCount((c) => c + 1)}>{count}</Button>;
};
```

Wrap your app:

```tsx
<CounterProvider>
  <MyComponent />
</CounterProvider>
```

Use the context state:

```tsx
const [count] = useCounterContext();
```

### 📌 Context Selectors

Works **just like global state**, but within the provider.

---

## 🔥 Observables: Watching State Changes

Observables **let you react to state changes** via subscriptions.

### 📌 Creating an Observable

```tsx
export const useCounter = createGlobalState(0);
export const counterLogs = useCounter.createObservable((count) => `Counter is at ${count}`);
```

### 📌 Subscribing to an Observable

```tsx
const unsubscribe = counterLogs((message) => {
  console.log(message);
});
```

### 📌 Using Observables Inside Context

```tsx
useEffect(() => {
  const unsubscribe = useCounterContext.subscribe((count) => {
    console.log(`Updated count: ${count}`);
  });

  return unsubscribe;
}, []);
```

---

## ⚖️ `createGlobalState` vs. `createContext`

| Feature                | `createGlobalState`                      | `createContext`                                                                                                    |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Scope**              | Available globally across the entire app | Scoped to the Provider where it’s used                                                                             |
| **How to Use**         | `const useCount = createGlobalState(0)`  | `const counter = createContext(0); counter.Provider, counter.use()`                                                |
| **createSelectorHook** | `useCount.createSelectorHook`            | `counter.use.createSelectorHook()`                                                                                 |
| **inline selectors?**  | ✅ Supported                             | ✅ Supported                                                                                                       |
| **Custom Actions**     | ✅ Supported                             | ✅ Supported                                                                                                       |
| **Observables**        | `useCount.createObservable`              | `counter.api().createObservable()`                                                                                 |
| **Best For**           | Global app state (auth, settings, cache) | Scoped module state, reusable component state, or state shared between child components without being fully global |

## 🔄 Lifecycle Methods

Global state hooks support lifecycle callbacks for additional control.

```tsx
const useData = createGlobalState(
  { value: 1 },
  {
    callbacks: {
      onInit: ({ setState }) => {
        console.log('Store initialized');
      },
      onStateChanged: ({ state, previousState }) => {
        console.log('State changed:', previousState, '→', state);
      },
      computePreventStateChange: ({ state, previousState }) => {
        return state.value === previousState.value;
      },
    },
  },
);
```

Use **`onInit`** for setup, **`onStateChanged`** to listen to updates, and **`computePreventStateChange`** to prevent unnecessary updates.

## Metadata

There is a possibility to add non reactive information in the global state:

```tsx
const useCount = createGlobalState(0, { metadata: { renders: 0 } });
```

How to use it?

```tsx
const [count, , metadata] = useCount();

metadata.renders += 1;
```

## 🎯 Ready to Try It?

📦 **NPM Package:** [react-hooks-global-states](https://www.npmjs.com/package/react-hooks-global-states)

🚀 Simplify your **global state management** in React & React Native today! 🚀
