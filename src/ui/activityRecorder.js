function clone(value) {
  return structuredClone(value);
}

function areEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function createActivityCommitter(getValue, onCommit) {
  let committedValue = clone(getValue());

  return {
    commit() {
      const nextValue = clone(getValue());
      const previousValue = committedValue;

      committedValue = nextValue;

      if (!areEqual(previousValue, nextValue)) {
        onCommit(previousValue, nextValue);
      }
    },
    reset() {
      committedValue = clone(getValue());
    },
  };
}
