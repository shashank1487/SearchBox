let storage = window.localStorage;

export const setItem = function(key, item) {
  storage && storage.setItem(key, item);
};
export const getItem = function(key) {
  let data = storage && storage.getItem(key);
  return data;
};

export const removeItem = function(key) {
  storage && storage.removeItem(key);
};
