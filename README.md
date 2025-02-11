# react-hooks-global-states 🌟

![Image John Avatar](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

Hi There! Welcome to **react-hooks-global-states** your New State Management Solution for React Components 🚀

Are you looking for a solution to manage **global state** in your **React components**? Look no further!

**react-hooks-global-states** is your option for efficiently handling global state management in your React applications.

One line of code for a **global state**! try it out now on [CODEPEN-react-global-state-hooks](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010) and witness the magic ✨.

For a deeper dive into how these hooks work, check out a comprehensive example at [react-global-state-hooks-example](https://johnny-quesada-developer.github.io/react-global-state-hooks-example/) 📘.

Want to explore how it works with **React Native**? Head over to [react-native-global-state-hooks](https://www.npmjs.com/package/react-native-global-state-hooks) for a hands-on experience 📱. You can also explore a **TODO-LIST** example using global state and asynchronous storage by heading to [todo-list-with-global-hooks](https://github.com/johnny-quesada-developer/todo-list-with-global-hooks.git) 📝.

For a more visual introduction, watch our informative video [here!](https://www.youtube.com/watch?v=1UBqXk2MH8I) 🎥 and dive into the code on [global-hooks-example](https://github.com/johnny-quesada-developer/global-hooks-example) 🧩.

The best part? **react-hooks-global-states** is compatible with both **React** and **React Native**. If you're building web applications, explore [**react-global-state-hooks**](https://www.npmjs.com/package/react-global-state-hooks), and for your React Native projects, check out [**react-native-global-state-hooks**](https://www.npmjs.com/package/react-native-global-state-hooks). These specialized libraries extend the capabilities of **react-hooks-global-states** to perfectly fit your specific development environments. Discover the ease of global state management today! 🌐

# Creating a global state

We are gonna create a global state hook **useCount** with one line of code.

```ts
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

export const useCount = createGlobalState(0);
```

That's it! Welcome to global hooks. Now, you can use this state wherever you need it in your application.

Let's see how to use it inside a simple **component**

```ts
const [count, setCount] = useCount();

return <Button onClick={() => setCount((count) => count + 1)}>{count}</Button>;
```

Isn't it cool? It works just like a regular **useState**. Notice the only difference is that now you don't need to provide the initial value since this is a global hook, and the initial value has already been provided.

# Selectors

What if you already have a global state that you want to subscribe to, but you don't want your component to listen to all the changes of the state, only a small portion of it? Let's create a more complex **state**

```ts
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

export const useContacts = createGlobalState({
  isLoading: true,
  entities: Contact[],
  selected: Set<number>,
});
```

Now, let's say we have a situation where we want to access only the list of contacts. We don't care about the rest of the state.

```tsx
// That's it. With that simple selector, we now get the list of contacts,
// and the component will only re-render if the property **entities** changes on the global state
const [contacts] = useContacts((state) => state.entities]);

return (
  <ul>
    {contacts.map((contact) => (
      <li key={contact.id}>{contact.name}</li>
    ))}
  </ul>
);
```

What about special cases, like when you have a map instead of an array and want to extract a list of contacts? It's common to use selectors that return a new array, but this can cause React to re-render because the new array has a different reference than the previous one.

```tsx
export const useContacts = createGlobalState({
  isLoading: true,
  entities: Map<number, Contact>,
  selected: Set<number>,
});

// The selector is simply a standard selector used to extract the values from the map.

const [contacts] = useContacts((state) => [...state.entities.values()], {
  // The isEqualRoots function allows you to create your own validation logic for determining when to recompute the selector.
  isEqualRoot: (a, b) => a.entities === b.entities,
});
```

Okay, everything works when the changes come from the state, but what happens if I want to recompute the selector based on the internal state of the component?

**component.ts**

```tsx
const [filter, setFilter] = useState('');

const [contacts] = useContacts(
  (state) => [...state.entities.values()].filter((item) => item.name.includes(filter)),
  {
    isEqualRoot: (a, b) => a.entities === b.entities,
    /**
     * Easy to understand, right? With the dependencies prop, you can,
     * just like with any other hook, provide a collection of values that will be compared during each render cycle
     * to determine if the selector should be recomputed.*/
    dependencies: [filter],
  }
);
```

And finally, what if you need to reuse this selector throughout your application and don't want to duplicate code?

```tsx
export const useContacts = createGlobalState({
  isLoading: true,
  entities: Map<number, Contact>,
  selected: Set<number>,
});

const useContactsArray = useContacts.createSelectorHook((state) => [...state.entities.values()], {
  isEqualRoot: (a, b) => a.entities === b.entities,
});
```

Now inside your component just call the new hook

**component.ts**

```tsx
const [filter, setFilter] = useState('');

const [contacts] = useContactsArray((entities) => entities.name.includes(filter), {
  dependencies: [filter],
});
```

Or you can create another selectorHook from your **useContactsArray**

```ts
const useContactsArray = useContacts.createSelectorHook((state) => [...state.entities.values()], {
  isEqualRoot: (a, b) => a.entities === b.entities,
});

const useContactsLength = useContactsArray.createSelectorHook((entities) => entities.length);
```

Or you can create a custom hook

```tsx
const useFilteredContacts = (filter: string) => {
  const [contacts] = useContactsArray((entities) => entities.name.includes(filter), {
    dependencies: [filter],
  });

  return contacts;
};
```

To summarize

```tsx
const [filter, setFilter] = useState('');

const [contacts] = useContacts((state) => state.contacts.filter((contact) => contact.name.includes(filter)), {
  /**
   * You can use the `isEqualRoot` to validate if the values before the selector are equal.
   * This validation will run before `isEqual` and if the result is true the selector will not be recomputed.
   * If the result is true the re-render of the component will be prevented.
   */
  isEqualRoot: (r1, r2) => r1.filter === r2.filter,

  /**
   * You can use the `isEqual` to validate if the values after the selector are equal.
   * This validation will run after the selector computed a new value...
   * and if the result is true it will prevent the re-render of the component.
   */
  isEqual: (filter1, filter2) => filter1 === filter2,

  /**
   * You can use the `dependencies` array as with regular hooks to to force the recomputation of the selector.
   * Is important ot mention that changes in the dependencies will not trigger a re-render of the component...
   * Instead the recomputation of the selector will returned immediately.
   */
  dependencies: [filter],
});

return (
  <ul>
    {contacts.map((contact) => (
      <li key={contact.id}>{contact.name}</li>
    ))}
  </ul>
);
```

Btw, If you want to perform a shallow comparison between the previous and new values, you can use the **shallowCompare** function from the library.

```TSX
({
  /**
  * You can use the `shallowCompare` from the GlobalStore.utils to compare the values at first level.
  */
  isEqual: shallowCompare,
})
```

Just remember, you can select or derive different values from the global state endlessly, but the state mutator will remain the same throughout the hooks.

More examples:

```ts
const useFilter = useContacts.createSelectorHook(({ filter }) => filter);

const useContactsArray = useContacts.createSelectorHook(({ items }) => items);

const useContactsLength = useContactsArray.createSelectorHook((items) => items.length);

const useIsContactsEmpty = useContactsLength.createSelectorHook((length) => !length);
```

It can't get any simpler, right? Everything is connected, everything is reactive. Plus, these hooks are strongly typed, so if you're working with **TypeScript**, you'll absolutely love it.

Each selector hook is reactive only to the fragment/derived of the state returned by the selector. And again you can optimize it by using the **isEqualRoot** and **isEqual** functions, which help avoid recomputing the selector if the root state or the fragment hasn't changed.

# State actions

Is common and often necessary to restrict the manipulation of state to a specific set of actions or operations. To achieve this, we can simplify the process by adding a custom API to the configuration of our **useContacts**.

By defining a custom API for the **useContacts**, we can encapsulate and expose only the necessary actions or operations that are allowed to modify the state. This provides a controlled interface for interacting with the state, ensuring that modifications stick to the desired restrictions.

```ts
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

export const useContacts = createGlobalState(
  {
    isLoading: true,
    filter: '',
    items: [] as Contact[],
  },
  {
    callbacks: {
      onInit: ({ setState }) => {
        // fetch contacts
      },
      actions: {
        setFilter(filter: string) {
          return ({ setState }) => {
            setState((state) => ({
              ...state,
              filter,
            }));
          };
        },
      },
    },
  }
);
```

That's it! In this updated version, the **useContacts** hook will no longer return [**state**, **stateMutator:Setter<State>**] but instead will return [**state**, **stateMutator:ActionCollectionResult<State>**]. This change will provide a more intuitive and convenient way to access and interact with the state and its associated actions.

Let's see how that will look now into our **FilterBar.tsx**

```tsx
const [filter, { setFilter }] = useFilter();

return <TextInput onChangeText={setFilter} />;
```

Yeah, that's it! All the **derived states** and **emitters** (we will talk about **emitters** this later) will inherit the new actions interface.

# State Controls

If you need to access the global state outside of a component or a hook without subscribing to state changes, or even inside a **ClassComponent**, you can use:

```tsx
useContacts.stateControls: () => [stateRetriever, stateMutator, metadataRetriever];

// example:
const [getContacts, setContacts] = useContacts.stateControls();

console.log(getContacts()); // prints the list of contacts
```

**stateMutator** is particularly useful when you want to create components that have editing access to a specific store but don't necessarily need to reactively respond to state changes.

Using the **stateRetriever** and the **stateMutator** allows you to retrieve the state when needed without establishing a reactive relationship with the state changes. This approach provides more flexibility and control over when and how components interact with the global state.

So, While **useContacts** will allow your components to subscribe to the custom hook, using the **contactsRetriever** method you will be able retrieve the current value of the state. This allows you to access the state whenever necessary, without being reactive to its changes and with the **contactsMutator** you now have the ability to modify the state without the need for subscription to the hook.

Additionally, to subscribe to state changes, you can pass a callback function as a parameter to the **stateRetriever**. This approach enables you to create a subscription group, allowing you to subscribe to either the entire state or a specific portion of it. When a callback function is provided to the **stateRetriever**, it will return a cleanup function instead of the state. This cleanup function can be used to unsubscribe or clean up the subscription when it is no longer needed.

```ts
/**
 * This not only allows you to retrieve the current value of the state...
 * but also enables you to subscribe to any changes in the state or a portion of it
 */
const unsubscribe1 = contactsRetriever((state) => {
  console.log('state changed: ', state);
});

const unsubscribe2 = contactsRetriever(
  (state) => state.isLoading,
  (isLoading) => {
    console.log('is loading changed', isLoading);
  }
);
```

That's great, isn't it? everything stays synchronized with the original state!!

## stateMutator

Let's add more actions to the state and explore how to use one action from inside another.

Here's an example of adding multiple actions to the state and utilizing one action within another:

```ts
import { createGlobalState } from 'react-hooks-global-states/createGlobalState';

export const useCount = createGlobalState(0, {
  actions: {
    log: (currentValue: string) => {
      return ({ getState }): void => {
        console.log(`Current Value: ${getState()}`);
      };
    },

    increase(value: number = 1) {
      return ({ getState, setState, actions }) => {
        setState((count) => count + value);

        actions.log(message);
      };
    },

    decrease(value: number = 1) {
      return ({ getState, setState, actions }) => {
        setState((count) => count - value);

        actions.log(message);
      };
    },
  },
});
```

Notice that the **StoreTools** will contain a reference to the generated actions API. From there, you'll be able to access all actions from inside another one... the **StoreTools** is generic and allow your to set an interface for getting the typing on the actions.

# createContext

**createContext** extends the powerful features of global hooks into the realm of React Context. By integrating global hooks within a context, you bring all the benefits of global state management—such as modularity, selectors, derived states, and actions—into a context-specific environment.

## Creating a reusable context

Forget about the boilerplate of creating a context... with **createContext** it's straightforward and powerful. You can create a context and provider with one line of code.

```tsx
import { createGlobalState } from 'react-hooks-global-states/createContext';

export const [useCounterContext, CounterProvider] = createContext(2);
```

Then just wrap the components you need with the provider:

```tsx
<CounterProvider>
  <MyComponent />
</CounterProvider>
```

And finally, access the context value with the **useCounterContext**, this function returns a **StateHook**.

You can execute it immediately to subscribe to the state changes

```tsx
const MyComponentInsideTheProvider = () => {
  const [count] = useCounterContext()();

  return <>{count}</>;
};
```

Or you can retrieve the **useCounterContext.stateControls();** to gain access to the getter and mutator without been affected by the changes on the state

```tsx
const MyComponent = () => {
  // won't re-render if the counter changes
  const [getCount, setCount] = useCounterContext().stateControls();

  return <button onClick={() => setCount((count) => count + 1)}>Increase</button>;
};
```

You'll still have selectors to extract just an specific portion of the state. If a selector is added the component only will change if that specific portion of the state changed.

```tsx
const MyComponent = () => {
  const [isEven, setCount] = useCounterContext()((count) => count % 2 === 0);

  useEffect(() => {
    // lets say that the initial state was *2* and we'll set it now to *4*
    setCount(4);

    // the component will not re-render cause 4 is also even
  }, []);

  return <>{isEven ? 'is even' : 'is odd'}</>;
};
```

**createContext** also allows you to add custom actions to control the manipulation of the state inside the context

```tsx
import { createContext } from 'react-global-state-hooks/createContext';

export const [useCounterContext, CounterProvider] = createContext(
  { count: 0 },
  {
    actions: {
      increase: (value: number = 1) => {
        return ({ setState }) => {
          setState((state) => ({
            ...state,
            count: state.count + value,
          }));
        };
      },
      decrease: (value: number = 1) => {
        return ({ setState }) => {
          setState((state) => ({
            ...state,
            count: state.count - value,
          }));
        };
      },
    },
  }
);
```

And just like with regular global hooks, now instead of a setState function, the hook will return the collection of actions

Last but not least, you can still creating **selectorHooks** with the **createSelectorHook** function, this hooks will only work if the if they are contained in the scope of the provider.

```tsx
const useIsEven = useCounterContext.createSelectorHook((count) => count % 2 === 0);
```

# Life cycle methods

There are some lifecycle methods available for use with global hooks, let's review them:

```ts
/**
* @description callback function called when the store is initialized
* @returns {void} result - void
* */
onInit?: ({
  /**
   * Set the metadata
   * @param {TMetadata} setter - The metadata or a function that will receive the metadata and return the new metadata
   * */
  setMetadata: MetadataSetter<TMetadata>;

  /**
   * Set the state
   * @param {TState} setter - The state or a function that will receive the state and return the new state
   * @param {{ forceUpdate?: boolean }} options - Options
   * */
  setState: StateSetter<TState>;

  /**
   * Get the state
   * @returns {TState} result - The state
   * */
  getState: () => TState;

  /**
   * Get the metadata
   * @returns {TMetadata} result - The metadata
   * */
  getMetadata: () => TMetadata;

  /**
   * Actions of the hook if configuration was provided
   */
  actions: TActions;
}: StateConfigCallbackParam<TState, TMetadata, TActions>) => void;

/**
* @description - callback function called every time the state is changed
*/
onStateChanged?: (parameters: StateChangesParam<TState, TMetadata, TActions>) => void;

/**
* callback function called every time a component is subscribed to the store
*/
onSubscribed?: (parameters: StateConfigCallbackParam<TState, TMetadata, TActions>) => void;

/**
* callback function called every time the state is about to change and it allows you to prevent the state change
*/
computePreventStateChange?: (parameters: StateChangesParam<TState, TMetadata, TActions>) => boolean;
```

You can pass this callbacks on the config objects when building a **createGlobalState**

```ts
const useData = createGlobalState(
  { value: 1 },
  {
    metadata: {
      someExtraInformation: 'someExtraInformation',
    },
    callbacks: {
      // onSubscribed: (StateConfigCallbackParam) => {},
      // onInit // etc
      computePreventStateChange: ({ state, previousState }) => {
        const prevent = isEqual(state, previousState);

        return prevent;
      },
    },
  }
);
```

Finally, if you have a very specific necessity but still want to use the global hooks, you can extend the **GlobalStoreAbstract** class.

Let's see an example again with the **asyncStorage** custom global hook but with the abstract class.

```ts
extends GlobalStoreAbstract<State, Metadata, ActionsConfig>
```

# That's it for now!! hope you enjoy coding!!
