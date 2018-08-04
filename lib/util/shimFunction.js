module.exports = function(el, key) {
  if (typeof el === 'function') {
    const temp = {};
    temp[key] = el;
    el = temp;
  }

  return el;
};
