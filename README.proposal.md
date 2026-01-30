# react-hooks-global-states 🌟

![Image John Avatar](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

**Effortless global state management for React, React Native, and Preact!** 🚀

Define **global state in just one line of code** and enjoy **lightweight, flexible, and scalable** state management with the familiarity of `useState`, but with the power of Redux and the simplicity of hooks. Zero configuration, fully typed, and framework-agnostic! ✨

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

export const useCounter = createGlobalState(0);

// That's it! Use it anywhere in your app 🎉
function Counter() {
  const [count, setCount] = useCounter();
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## 🔗 Explore More

- **[Live Example](https://johnny-quesada-developer.github.io/global-hooks-example/)** 📘
- **[Video Overview](https://www.youtube.com/watch?v=1UBqXk2MH8I/)** 🎥
- **[CodePen Demo](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)** - Try it now!
- **[react-hooks-global-states](https://www.npmjs.com/package/react-hooks-global-states)** - Compatible with React & React Native
- **[react-global-state-hooks](https://www.npmjs.com/package/react-global-state-hooks)** - Web with **localStorage integration**
- **[react-native-global-state-hooks](https://www.npmjs.com/package/react-native-global-state-hooks)** - React Native with **AsyncStorage integration**

---

## 🚀 DevTools Extension

React Hooks Global States includes a dedicated **DevTools extension** to streamline your development workflow! Easily visualize, inspect, debug, and modify your application's global state in real-time within your browser.

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

---

## 🎯 Why This Library?

| Feature                    | react-hooks-global-states              | Redux                  | Zustand           | Jotai                   |
| -------------------------- | -------------------------------------- | ---------------------- | ----------------- | ----------------------- |
| **Setup complexity**       | ✅ One line                            | ❌ Boilerplate heavy   | ✅ Minimal        | ✅ Minimal              |
| **TypeScript**             | ✅ Full inference                      | ⚠️ Manual typing       | ✅ Good           | ✅ Good                 |
| **Selectors**              | ✅ Built-in + chainable                | ⚠️ Separate lib needed | ✅ Built-in       | ✅ Built-in             |
| **Actions/Reducers**       | ✅ Optional, type-safe                 | ✅ Required            | ✅ Optional       | ❌ Not built-in         |
| **DevTools**               | ✅ Dedicated extension                 | ✅ Redux DevTools      | ⚠️ Via middleware | ⚠️ Via additional setup |
| **Scoped state (Context)** | ✅ Built-in API                        | ❌                     | ⚠️ Manual         | ✅ Via atoms            |
| **Observable patterns**    | ✅ First-class                         | ❌                     | ⚠️ Via subscribe  | ⚠️ Custom               |
| **Dependencies array**     | ✅ Selector deps                       | ❌                     | ❌                | ❌                      |
| **Learning curve**         | ✅ If you know useState, you know this | ❌ High                | ✅ Low            | ✅ Low                  |

---

## 📦 Installation

```bash
npm install react-hooks-global-states
# or
yarn add react-hooks-global-states
# or
pnpm add react-hooks-global-states
```

**Platform-specific packages with storage integration:**

- **[react-global-state-hooks](https://www.npmjs.com/package/react-global-state-hooks)** - Web with localStorage
- **[react-native-global-state-hooks](https://www.npmjs.com/package/react-native-global-state-hooks)** - React Native with AsyncStorage

---

## 🚀 Quick Start

### Basic Usage

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

// Create a global state
const useAuth = createGlobalState<{ user: User | null }>({ user: null });

// Use it in any component
function UserProfile() {
  const [auth, setAuth] = useAuth();

  if (!auth.user) return <Login />;

  return <div>Welcome {auth.user.name}</div>;
}

function LoginButton() {
  const [, setAuth] = useAuth();

  return <button onClick={() => setAuth({ user: { name: 'John' } })}>Login</button>;
}
```

---

## 🎛️ Core Features

### 1️⃣ Selectors - Subscribe to Specific State Changes

For complex state objects, selectors allow components to subscribe only to the parts of state they care about, preventing unnecessary re-renders.

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useContacts = createGlobalState({
  items: [] as Contact[],
  filter: '',
  selectedIds: new Set<number>(),
});

// Component only re-renders when items change
function ContactList() {
  const [contacts] = useContacts((state) => state.items);

  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact.id}>{contact.name}</li>
      ))}
    </ul>
  );
}

// Component only re-renders when filter changes
function SearchBar() {
  const [filter, setContacts] = useContacts(
    (state) => state.filter,
    // Second parameter can customize equality checks
    { isEqualRoot: (a, b) => a.filter === b.filter },
  );

  return (
    <input value={filter} onChange={(e) => setContacts((prev) => ({ ...prev, filter: e.target.value }))} />
  );
}
```

### 2️⃣ Derived Selectors with Dependencies

Unlike Redux, derived values automatically recompute when dependencies change while maintaining optimal performance.

```tsx
function FilteredContacts() {
  const [filter] = useContacts((state) => state.filter);

  // This selector recomputes when filter dependency changes
  const [filtered] = useContacts(
    (state) => state.items.filter((c) => c.name.includes(filter)),
    [filter], // Dependencies array
  );

  return <ContactList contacts={filtered} />;
}

// Or use options object for more control
function FilteredContactsAdvanced() {
  const [filter] = useContacts((state) => state.filter);

  const [filtered] = useContacts((state) => state.items.filter((c) => c.name.includes(filter)), {
    dependencies: [filter],
    isEqualRoot: (a, b) => a.items === b.items,
    isEqual: (a, b) => a.length === b.length,
  });

  return <ContactList contacts={filtered} />;
}
```

### 3️⃣ Reusable Selector Hooks

Create derived hooks that can be reused across components and chained together.

```tsx
// Create reusable selectors
const useContactsArray = useContacts.createSelectorHook((state) => state.items);

const useContactsCount = useContactsArray.createSelectorHook((items) => items.length);

const useFilteredContacts = useContactsArray.createSelectorHook((items, filter) =>
  items.filter((c) => c.name.includes(filter)),
);

// Use them in components
function Stats() {
  const [count] = useContactsCount();
  return <div>Total contacts: {count}</div>;
}

function ContactList() {
  const [filter] = useContacts((state) => state.filter);

  // Selector hooks still support inline selectors with dependencies!
  const [filtered] = useContactsArray(
    (contacts) => contacts.filter((c) => c.name.includes(filter)),
    [filter],
  );

  return <ul>{/* ... */}</ul>;
}
```

**✅ Important:** All selector hooks share the same state mutator, ensuring consistency:

```tsx
const [, setContactsArray] = useContactsArray();
const [, setContactsOriginal] = useContacts();

// These are the same function!
console.log(setContactsArray === setContactsOriginal); // true
console.log(setContactsArray === useContacts.setState); // true
```

### 4️⃣ Actions - Structured State Mutations

Restrict state modifications to predefined actions for better architecture and type safety.

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useContacts = createGlobalState(
  { items: [], filter: '', loading: false },
  {
    actions: {
      // Async actions are fully supported
      async fetch() {
        return async ({ setState, getState }) => {
          setState((prev) => ({ ...prev, loading: true }));

          try {
            const items = await fetchContacts();
            setState((prev) => ({ ...prev, items, loading: false }));
          } catch (error) {
            setState((prev) => ({ ...prev, loading: false }));
          }
        };
      },

      // Parameterized actions
      setFilter(filter: string) {
        return ({ setState }) => {
          setState((prev) => ({ ...prev, filter }));
        };
      },

      // Actions can access other actions
      addContact(contact: Contact) {
        return ({ setState, actions }) => {
          setState((prev) => ({
            ...prev,
            items: [...prev.items, contact],
          }));

          // Clear filter after adding
          actions.setFilter('');
        };
      },
    },
  },
);

// When actions are defined, the second element is the actions object
function ContactManager() {
  const [state, actions] = useContacts();

  useEffect(() => {
    actions.fetch();
  }, []);

  return (
    <div>
      {state.loading && <Spinner />}
      <input value={state.filter} onChange={(e) => actions.setFilter(e.target.value)} />
      <button onClick={() => actions.addContact(newContact)}>Add Contact</button>
    </div>
  );
}
```

**Note:** When actions are defined, direct `setState` is replaced by the actions object. However, `setState` is still available via the API for testing: `useContacts.setState()`

---

## � Action Groups with `actionsFor`

Need to **extend a store with additional actions** without modifying the original store definition? Use `actionsFor` to create action groups that can access both the store's state **and parent store actions**! Perfect for composition and code organization! 🎉

### 📌 Direct Binding

Bind actions directly to a store:

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';
import { actionsFor } from 'react-hooks-global-states/actionsFor';

const useCounter = createGlobalState(0);

const counterActions = actionsFor(useCounter.api(), {
  increment() {
    return ({ setState, getState }) => {
      setState(getState() + 1);
    };
  },
  decrement() {
    return ({ setState, getState }) => {
      setState(getState() - 1);
    };
  },
  reset() {
    return ({ setState }) => {
      setState(0);
    };
  },
});

// Use them anywhere in your app!
counterActions.increment();
counterActions.decrement();
counterActions.reset();
```

### 📌 Builder Pattern (Reusable Templates!)

Create **reusable action templates** that can be applied to multiple stores. This is incredibly powerful for code reuse! 💪

```tsx
import { actionsFor } from 'react-hooks-global-states/actionsFor';

// Create a reusable template
const withCounterActions = actionsFor().with({
  increment() {
    return ({ setState, getState }) => {
      setState(getState() + 1);
    };
  },
  decrement() {
    return ({ setState, getState }) => {
      setState(getState() - 1);
    };
  },
  incrementBy(amount: number) {
    return ({ setState, getState }) => {
      setState(getState() + amount);
    };
  },
});

// Apply it to different stores! 🚀
const counter1Actions = withCounterActions(useCounter1.api());
const counter2Actions = withCounterActions(useCounter2.api());

counter1Actions.increment(); // Updates counter1
counter2Actions.incrementBy(5); // Updates counter2 by 5
```

### 📌 Accessing Parent Actions

Actions created with `actionsFor` can call **parent store actions** via `this.actions`. This enables powerful composition patterns! 🔗

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';
import { actionsFor } from 'react-hooks-global-states/actionsFor';

const useCounter = createGlobalState(0, {
  actions: {
    reset() {
      return ({ setState }) => setState(0);
    },
    setTo(value: number) {
      return ({ setState }) => setState(value);
    },
  },
});

// Extend with additional actions that can use parent actions
const extendedActions = actionsFor(useCounter.api(), {
  incrementAndLog() {
    return ({ setState, getState }) => {
      const newValue = getState() + 1;
      setState(newValue);
      console.log(`Incremented to ${newValue}`);
    };
  },
  resetWithMessage() {
    return function () {
      // Call parent action! ✨
      this.actions.reset();
      console.log('Counter has been reset!');
    };
  },
  doubleIt() {
    return function ({ getState }) {
      // Access parent actions and use them
      const current = getState();
      this.actions.setTo(current * 2);
    };
  },
});

extendedActions.resetWithMessage(); // Calls parent reset() and logs message
extendedActions.doubleIt(); // Doubles the counter using parent setTo()
```

### 📌 Complex Example: Async Actions with Dependencies

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';
import { actionsFor } from 'react-hooks-global-states/actionsFor';

const useTodos = createGlobalState(
  { items: [], loading: false },
  {
    actions: {
      setLoading(loading: boolean) {
        return ({ setState, getState }) => {
          setState({ ...getState(), loading });
        };
      },
    },
  },
);

const todoActions = actionsFor(useTodos.api(), {
  async fetchTodos() {
    return async function ({ setState, getState }) {
      // Use parent action
      this.actions.setLoading(true);

      try {
        const items = await fetch('/api/todos').then((r) => r.json());
        setState({ ...getState(), items, loading: false });
      } catch (error) {
        this.actions.setLoading(false);
        throw error;
      }
    };
  },

  addTodo(text: string) {
    return ({ setState, getState }) => {
      const newTodo = { id: Date.now(), text, completed: false };
      const items = [...getState().items, newTodo];
      setState({ ...getState(), items });
    };
  },

  async addAndRefresh(text: string) {
    return async function () {
      // Compose multiple actions! 🎯
      this.addTodo(text);
      await this.fetchTodos();
    };
  },
});

// Use them!
await todoActions.fetchTodos();
todoActions.addTodo('Learn actionsFor');
await todoActions.addAndRefresh('This is awesome!');
```

### ✨ Why Use `actionsFor`?

- **🔄 Composability** – Mix and match action groups across stores without modifying original definitions
- **📦 Reusability** – Define action templates once, use them everywhere
- **🔗 Access Parent Actions** – New actions can leverage existing store logic via `this.actions`
- **💪 Type Safety** – Full TypeScript inference for actions, parameters, and state
- **🎯 Separation of Concerns** – Keep core store simple, extend with specialized action groups
- **🚀 Progressive Enhancement** – Start simple, add complexity as needed

---

## �🌐 Non-Component Usage

Access and manipulate state outside React components - perfect for services, utilities, and event handlers.

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useAuth = createGlobalState({ user: null, token: null });

// API service
class AuthService {
  async login(credentials: Credentials) {
    const { user, token } = await api.login(credentials);

    // Direct state access
    useAuth.setState({ user, token });
  }

  async logout() {
    await api.logout();
    useAuth.setState({ user: null, token: null });
  }

  getToken() {
    // Get current state synchronously
    return useAuth.getState().token;
  }
}

// Subscribe to changes outside components
const unsubscribe = useAuth.subscribe((state) => {
  console.log('Auth state changed:', state);

  // Sync to external storage
  if (state.token) {
    localStorage.setItem('token', state.token);
  }
});

// Later: cleanup
unsubscribe();
```

### Subscriptions with Selectors

Subscriptions support the same selector API as hooks:

```tsx
// Subscribe to a specific part of state
const unsubscribe = useAuth.subscribe(
  (state) => state.user,
  (user) => {
    console.log('User changed:', user);
  },
);

// With options
const unsubscribe2 = useAuth.subscribe(
  (state) => state.user,
  (user) => {
    analytics.identify(user);
  },
  {
    skipFirst: true, // Don't call on initial subscribe
    isEqual: (a, b) => a?.id === b?.id,
  },
);
```

### Cross-State Dependencies

One global state can react to changes in another:

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useSelectedContact = createGlobalState<Contact | null>(null, {
  callbacks: {
    onInit: ({ setState, getState }) => {
      // When contacts change, clear selection if contact was deleted
      return useContacts.subscribe(
        (state) => state.items,
        (contacts) => {
          const selected = getState();
          if (selected && !contacts.find((c) => c.id === selected.id)) {
            setState(null);
          }
        },
      );
    },
  },
});
```

---

## 🎭 Context API - Scoped State

When you need state scoped to a component tree instead of globally available. Same powerful API, different scope! 🎯

```tsx
import { createContext } from 'react-hooks-global-states/createContext';

// Create a context with initial state
const TodoListContext = createContext(
  { todos: [], filter: 'all' },
  {
    actions: {
      addTodo(text: string) {
        return ({ setState }) => {
          const newTodo = { id: Date.now(), text, completed: false };
          setState((prev) => ({
            ...prev,
            todos: [...prev.todos, newTodo],
          }));
        };
      },

      toggleTodo(id: number) {
        return ({ setState }) => {
          setState((prev) => ({
            ...prev,
            todos: prev.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
          }));
        };
      },

      setFilter(filter: 'all' | 'active' | 'completed') {
        return ({ setState }) => {
          setState((prev) => ({ ...prev, filter }));
        };
      },
    },
  },
);

// Wrap your component tree
function App() {
  return (
    <TodoListContext.Provider>
      <TodoList />
      <TodoStats />
    </TodoListContext.Provider>
  );
}

// Use the context hook
function TodoList() {
  const [state, actions] = TodoListContext.use();

  return (
    <div>
      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            actions.addTodo(e.currentTarget.value);
          }
        }}
      />

      {state.todos.map((todo) => (
        <div key={todo.id} onClick={() => actions.toggleTodo(todo.id)}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}

// Access context API without triggering re-renders
function Logger() {
  const api = TodoListContext.use.api();

  useEffect(() => {
    // This component won't re-render when state changes
    const unsubscribe = api.subscribe((state) => {
      console.log('State changed:', state);
    });

    return unsubscribe;
  }, []);

  return null;
}
```

### Context Features

All the same features as global state:

```tsx
// Selectors
const [todos] = TodoListContext.use((state) => state.todos);

// Selector hooks
const useTodos = TodoListContext.use.createSelectorHook((state) => state.todos);
const useTodoCount = useTodos.createSelectorHook((todos) => todos.length);

// Observables
const { context } = TodoListContext.Provider.makeProviderWrapper();
const todoObservable = context.current.createObservable((state) => state.todos);

// Access actions
const actions = TodoListContext.use.actions();
const [count, actions] = TodoListContext.use();

// Non-reactive API access
const api = TodoListContext.use.api();
api.getState();
api.setState({ todos: [], filter: 'all' });
api.subscribe((state) => console.log(state));
```

### Multiple Providers

Each provider creates an isolated state instance:

```tsx
function App() {
  return (
    <div>
      <TodoListContext.Provider>
        <TodoList title="Work Tasks" />
      </TodoListContext.Provider>

      <TodoListContext.Provider>
        <TodoList title="Personal Tasks" />
      </TodoListContext.Provider>
    </div>
  );
}
```

---

## 🔭 Observables - Reactive State Fragments

Observables provide a subscription-based API for watching specific state changes, useful for non-component code. Think of them as lightweight reactive streams! 🌊

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useCounter = createGlobalState(0);

// Create an observable that transforms the state
const counterLogs = useCounter.createObservable((count) => `Counter is at ${count}`);

// Subscribe to changes
const unsubscribe = counterLogs((message) => {
  console.log(message); // "Counter is at 0", "Counter is at 1", etc.
});

// Observables can be chained
const isEven = useCounter.createObservable((count) => count % 2 === 0);
const evenMessage = isEven.createObservable((even) => (even ? 'Even number' : 'Odd number'));

evenMessage((msg) => console.log(msg));

// Cleanup
unsubscribe();
```

### Observable API

Observables expose the same readonly API as hooks:

```tsx
const observable = useCounter.createObservable((count) => count * 2);

// Get current value
observable.getState(); // returns doubled count

// Subscribe to changes
const unsub = observable.subscribe((doubled) => {
  console.log('Doubled value:', doubled);
});

// Create derived observables
const quadrupled = observable.createObservable((doubled) => doubled * 2);

// Create selector hooks from observables
const useDoubled = observable.createSelectorHook((state) => state);

// Cleanup
observable.dispose(); // Cleans up subscriptions
```

---

## 🔄 Lifecycle Callbacks

Hook into state initialization and changes for setup, cleanup, and validation. Perfect for side effects! ⚡

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useData = createGlobalState(
  { value: 0, lastUpdated: null },
  {
    callbacks: {
      // Called once when store initializes
      onInit: ({ setState, subscribe }) => {
        console.log('Store initialized');

        // Return cleanup function
        return () => {
          console.log('Store cleaned up');
        };
      },

      // Called after every state change
      onStateChanged: ({ state, previousState, identifier }) => {
        console.log('State changed:', previousState, '→', state);

        if (identifier) {
          console.log('Change identifier:', identifier);
        }

        // Update timestamp
        setState((prev) => ({ ...prev, lastUpdated: Date.now() }));
      },

      // Prevent specific state changes
      computePreventStateChange: ({ state, previousState }) => {
        // Prevent setting value to same number
        return state.value === previousState.value;
      },

      // Called when a component subscribes
      onSubscribed: (storeTools, subscription) => {
        console.log('New subscriber added');
      },
    },
  },
);

// Trigger with identifier for debugging
useData.setState({ value: 5 }, { identifier: 'manual-update' });

// Force update even if state is the same
useData.setState((state) => state, { forceUpdate: true });
```

---

## 📊 Metadata - Non-Reactive Data

Store non-reactive information alongside your state without triggering re-renders. Great for tracking stats, timestamps, and other auxiliary data! 📈

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useCounter = createGlobalState(0, {
  metadata: {
    createdAt: Date.now(),
    updateCount: 0,
  },
});

function Counter() {
  const [count, setCount, metadata] = useCounter();

  // Metadata doesn't cause re-renders when modified
  metadata.updateCount += 1;

  return (
    <div>
      <p>Count: {count}</p>
      <p>Updates: {metadata.updateCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Access metadata externally
const meta = useCounter.getMetadata();
console.log(meta.createdAt);

// Update metadata
useCounter.setMetadata((prev) => ({
  ...prev,
  lastAccessed: Date.now(),
}));
```

---

## 🧪 Testing & Debugging

### Reset State for Tests

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useCounter = createGlobalState(0);

afterEach(() => {
  // Reset to initial state
  useCounter.reset(0, {});
});

test('counter increments', () => {
  const { result } = renderHook(() => useCounter());
  const [, setCount] = result.current;

  act(() => setCount(1));

  expect(result.current[0]).toBe(1);
});
```

### Dispose for Cleanup

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

const useTemp = createGlobalState({ data: [] });

// When done with the store
useTemp.dispose(); // Clears all subscriptions and executes cleanup
```

### DevTools Extension

**[Install React Hooks Global States DevTools](https://chromewebstore.google.com/detail/bafojplmkpejhglhjpibpdhoblickpee)**

Features:

- 📊 Track all state changes in real-time
- ✏️ Modify state directly from the extension
- ⏮️ Time-travel debugging - restore previous states
- 🎯 Action granularity - see individual action executions
- 🔍 Inspect metadata and subscribers

### Debug Identifiers

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

// Name your stores for easier debugging
const useAuth = createGlobalState({ user: null }, { name: 'AuthStore' });

// Use identifiers when updating state
useAuth.setState(
  { user: newUser },
  {
    identifier: 'login-success',
  },
);
```

### Type Inference Helpers

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';
import type { InferAPI } from 'react-hooks-global-states/types';

const useStore = createGlobalState(/* ... */);

// Infer the complete API type
type StoreAPI = InferAPI<typeof useStore>;

// Use in functions that need the store tools
function doSomething(store: StoreAPI) {
  store.getState();
  store.setState(/* ... */);
  store.subscribe(/* ... */);
}
```

---

## 📚 API Reference

### `createGlobalState(initialState, options?)`

Creates a global state hook.

**Parameters:**

- `initialState`: Initial state value
- `options?`: Configuration object
  - `name?`: Debug name
  - `metadata?`: Non-reactive metadata
  - `callbacks?`: Lifecycle callbacks
    - `onInit?`: Called on initialization
    - `onStateChanged?`: Called after state changes
    - `computePreventStateChange?`: Validation function
    - `onSubscribed?`: Called when component subscribes
  - `actions?`: Action definitions

**Returns:** State hook with extended API

**Hook API:**

- `use()` - Use in component (same as calling the hook directly)
- `select(selector, deps?)` - Select a value without subscribing to state changes
- `getState()` - Get current state
- `setState(update, options?)` - Update state
- `subscribe(callback)` / `subscribe(selector, callback, options?)` - Subscribe to changes
- `getMetadata()` - Get metadata
- `setMetadata(update)` - Update metadata
- `createSelectorHook(selector, options?)` - Create derived hook
- `createObservable(selector, options?)` - Create observable
- `reset(state, metadata)` - Reset store
- `dispose()` - Cleanup
- `actions` - Action methods (when actions defined)
- `subscribers` - Active subscriptions (debugging)

### `createContext(initialState, options?)`

Creates a context with the same API as global state, but scoped to a Provider.

**Parameters:** Same as `createGlobalState`

**Returns:** Context object

- `Provider` - Context provider component
  - `makeProviderWrapper()` - Get provider wrapper and context ref
- `use` - Use the context (must be inside Provider)
  - Same API as global state hook
  - `use.api()` - Get non-reactive API access
  - `use.actions()` - Get just the actions

---

## 💡 Best Practices

### 1. Organize State by Domain

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

// ✅ Good - domain-focused
const useAuth = createGlobalState({ ... });
const useCart = createGlobalState({ ... });
const useProducts = createGlobalState({ ... });

// ❌ Avoid - one giant state
const useAppState = createGlobalState({
  auth: { ... },
  cart: { ... },
  products: { ... },
});
```

### 2. Use Actions for Complex Logic

```tsx
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

// ✅ Good - encapsulated business logic
const useCart = createGlobalState(initialCart, {
  actions: {
    addItem(product: Product, quantity: number) {
      return ({ setState }) => {
        // Validation, calculations, side effects
        if (quantity <= 0) return;

        setState((cart) => ({
          ...cart,
          items: [...cart.items, { product, quantity }],
          total: calculateTotal(cart, product, quantity),
        }));
      };
    },
  },
});

// ❌ Avoid - business logic in components
function Component() {
  const [cart, setCart] = useCart();

  const addItem = (product, quantity) => {
    if (quantity <= 0) return;
    setCart((cart) => ({
      ...cart,
      items: [...cart.items, { product, quantity }],
      total: calculateTotal(cart, product, quantity),
    }));
  };
}
```

### 3. Use Selectors for Performance

```tsx
// ✅ Good - only re-renders when relevant data changes
const [userName] = useAuth((state) => state.user?.name);

// ❌ Avoid - re-renders on any auth state change
const [auth] = useAuth();
const userName = auth.user?.name;
```

### 4. Leverage Selector Hooks for Reusability

```tsx
// ✅ Good - reusable, testable
const useUserName = useAuth.createSelectorHook((state) => state.user?.name);

// Use in multiple components
function Header() {
  const [name] = useUserName();
  return <div>Hello {name}</div>;
}

function Profile() {
  const [name] = useUserName();
  return <h1>{name}'s Profile</h1>;
}
```

### 5. Use Context for Isolated Features

```tsx
import { createContext } from 'react-hooks-global-states/createContext';

// ✅ Good - wizard state isolated to flow
const WizardContext = createContext({ step: 1, data: {} });

function CheckoutWizard() {
  return (
    <WizardContext.Provider>
      <WizardSteps />
    </WizardContext.Provider>
  );
}

// ❌ Avoid - global state for temporary UI state
const useWizardState = createGlobalState({ step: 1, data: {} });
```

### 6. Use `actionsFor` for Extending Stores

```tsx
import { actionsFor } from 'react-hooks-global-states/actionsFor';

// ✅ Good - extend stores with reusable action templates
const withLogging = actionsFor().with({
  logState() {
    return ({ getState }) => {
      console.log('Current state:', getState());
    };
  },
});

// Apply to any store!
const counterWithLogging = withLogging(useCounter.api());
const authWithLogging = withLogging(useAuth.api());

// ❌ Avoid - repeating the same actions in multiple stores
const useCounter = createGlobalState(0, {
  actions: {
    logState() {
      /* duplicate code */
    },
  },
});

const useAuth = createGlobalState(null, {
  actions: {
    logState() {
      /* duplicate code */
    },
  },
});
```

---

## 🔗 Resources

- **[Live Example](https://johnny-quesada-developer.github.io/global-hooks-example/)**
- **[Video Overview](https://www.youtube.com/watch?v=1UBqXk2MH8I/)**
- **[CodePen Demo](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)**
- **[DevTools Extension](https://chromewebstore.google.com/detail/bafojplmkpejhglhjpibpdhoblickpee)**
- **[GitHub Repository](https://github.com/johnny-quesada-developer/react-hooks-global-states)**

## 📦 Related Packages

- **[react-global-state-hooks](https://www.npmjs.com/package/react-global-state-hooks)** - Web with localStorage integration
- **[react-native-global-state-hooks](https://www.npmjs.com/package/react-native-global-state-hooks)** - React Native with AsyncStorage integration

---

## 📄 License

MIT © [Johnny Quesada](https://github.com/johnny-quesada-developer)

---

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ by developers, for developers**
