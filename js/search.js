import { debounce } from "../utils/helper.js";
import * as CONSTANTS from "../utils/constants.js";
import * as storage from "../utils/storage.js";

const Search = function(elements = {}) {
  this.els = {};
  this.setElements(this.els, elements);
  this.data = [];
  this.searchResults = [];
  //this.position = null;
  this.initialize();
};

Search.prototype.setElements = function(els, elements) {
  let searchElementClass = elements.searchInput || ".search-input";
  let resultsElementClass = elements.results || ".search-results";
  let loadingClass = elements.loading || ".loading";

  els.searchText = document.querySelector(searchElementClass);
  els.searchResults = document.querySelector(resultsElementClass);
  els.loading = document.querySelector(loadingClass);
};

Search.prototype.initialize = async function() {
  let self = this,
    searchData;

  searchData = storage.getItem(CONSTANTS.SEARCH_DATA);
  if (searchData) {
    this.data = JSON.parse(searchData);
  } else {
    this.els.loading.classList.remove("disabled");
    let response = await fetch(CONSTANTS.API);
    searchData = await response.json();
    this.els.loading.classList.add("disabled");
    storage.setItem(CONSTANTS.SEARCH_DATA, JSON.stringify(searchData));
    this.data = searchData;
  }

  let performSearchBounded = this.performSearch.bind(this);
  let deBouncedPerformSearch = debounce(performSearchBounded);

  this.els.searchText.addEventListener("keydown", function(e) {
    if (e.keyCode === 38 || e.keyCode === 40) {
      e.preventDefault();
    }
  });

  this.els.searchText.addEventListener("keyup", function(e) {
    if (
      (e.keyCode >= 48 && e.keyCode <= 90) ||
      (e.keyCode >= 96 && e.keyCode <= 111) ||
      (e.keyCode >= 186 && e.keyCode <= 192) ||
      (e.keyCode >= 219 && e.keyCode <= 222) ||
      e.keyCode === 8 ||
      e.keyCode === 46
    ) {
      let {
        target: { value: filter }
      } = e;
      deBouncedPerformSearch(filter);
    } else if (e.keyCode === 38) {
      self.els.searchResults.style.pointerEvents = "none";
      self.addKeyboardNavigation(CONSTANTS.DIRECTION.UP);
    } else if (e.keyCode === 40) {
      self.els.searchResults.style.pointerEvents = "none";
      self.addKeyboardNavigation(CONSTANTS.DIRECTION.DOWN);
    }
  });

  this.els.searchResults.addEventListener("mouseover", function(e) {
    //let { pageY } = e;
    // let position = target.dataset.position;
    // if (!position) {
    //   let searchItem = target.closest(".search-item");
    //   position = searchItem && searchItem.dataset.position;
    // }
    //if (pageY !== self.position) {
    self.removeKeyboardNavigation();
    self.addMouseNavigation(e);
    //self.position = pageY;
    //} else {
    //let previousElementSibling = e.target.previousElementSibling;
    //previousElementSibling && previousElementSibling.classList.add("hovered");
    //}
    //setTimeout(() => self.addMouseNavigation(e), 50);
  });

  this.els.searchResults.addEventListener("mouseout", function(e) {
    self.removeMouseNavigation(e);
  });
};

Search.prototype.performSearch = function(filter) {
  let self = this;

  this.searchResults = [];

  if (!filter) {
    this.els.searchResults.innerHTML = getNoSearchResultsHTML();
  } else {
    this.els.searchResults.innerHTML = filterUserData.call(this, filter);
    this.els.searchResults.classList.add("show");
  }

  let nodes = this.getNodesForHighlighting(document.querySelector(".search"));
  let regex = new RegExp(this.els.searchText.value, "gi");
  if (nodes && nodes.length > 0) {
    nodes.forEach(node => {
      let match = node.innerHTML.match(regex);
      if (match) {
        node.innerHTML = node.innerHTML.replace(
          regex,
          `<span class="highlight">${match[0]}</span>`
        );
      }
    });
  }

  function filterUserData(filter) {
    [[...this.data]]
      .map(filterBy.call(self, CONSTANTS.FILTER_COLUMNS.ID, filter))
      .map(filterBy.call(self, CONSTANTS.FILTER_COLUMNS.NAME, filter))
      .map(filterBy.call(self, CONSTANTS.FILTER_COLUMNS.ITEMS, filter))
      .map(filterBy.call(self, CONSTANTS.FILTER_COLUMNS.ADDRESS, filter))
      .map(filterBy.call(self, CONSTANTS.FILTER_COLUMNS.PINCODE, filter));
    return [this.searchResults].map(mapUserDataToHTML).pop();
  }

  function filterBy(column, filter) {
    return function(data, index) {
      let filterResults = data.filter(function(item, index, arr) {
        let searchColumnValue = item[column];
        if (Array.isArray(searchColumnValue)) {
          return searchColumnValue.some(
            value => value.toLowerCase().indexOf(filter.toLowerCase()) !== -1
          );
        }
        return (
          searchColumnValue.toLowerCase().indexOf(filter.toLowerCase()) !== -1
        );
      });
      if (filterResults && filterResults.length > 0) {
        self.searchResults = self.searchResults.concat(filterResults);
        data = data.filter(item => !filterResults.some(i => i.id === item.id));
      }
      return data;
    };
  }

  function mapUserDataToHTML(data) {
    return data && data.length > 0
      ? data
          .map(function(item, index) {
            return `
      <div class="search-item" data-position="${index + 1}">
      <span class="id">${item.id}</span>
      <span class="name">${item.name}</span>
      <ul class="items">
      ${item.items &&
        item.items.map(it => `<li class="item">${it}</li>`).join("")}
      </ul>
      <span class="address">${item.address}</span>
      <span class="pincode">${item.pincode}</span>
      </div>
      `;
          })
          .join("")
      : getNoSearchResultsHTML();
  }

  function getNoSearchResultsHTML() {
    return `<div class="no-result">
    <span class="message">No User Found</span>
    </div>`;
  }
};

Search.prototype.addKeyboardNavigation = function(direction) {
  let selectedSearchItem, hoveredSearchItem, searchItemToBeSelected;
  if (this.searchResults && this.searchResults.length > 0) {
    selectedSearchItem = this.els.searchResults.querySelector(
      ".search-item.selected"
    );
    if (selectedSearchItem) {
      selectedSearchItem.classList.remove("selected");

      searchItemToBeSelected =
        direction === CONSTANTS.DIRECTION.DOWN
          ? selectedSearchItem.nextElementSibling
          : selectedSearchItem.previousElementSibling;

      if (!searchItemToBeSelected) {
        if (direction === CONSTANTS.DIRECTION.DOWN) {
          searchItemToBeSelected = this.els.searchResults.firstElementChild;
        } else {
          searchItemToBeSelected = this.els.searchResults.lastElementChild;
        }
      }
      searchItemToBeSelected.classList.add("selected");
      this.scrollInToView(searchItemToBeSelected);
    } else {
      hoveredSearchItem = this.els.searchResults.querySelector(
        ".search-item.hovered"
      );
      if (hoveredSearchItem) {
        hoveredSearchItem.classList.remove("hovered");
        searchItemToBeSelected =
          direction === CONSTANTS.DIRECTION.DOWN
            ? hoveredSearchItem.nextElementSibling
            : hoveredSearchItem.previousElementSibling;
        if (!searchItemToBeSelected) {
          searchItemToBeSelected =
            direction === CONSTANTS.DIRECTION.DOWN
              ? this.els.searchResults.firstElementChild
              : this.els.searchResults.lastElementChild;
        }
      } else {
        searchItemToBeSelected =
          direction === CONSTANTS.DIRECTION.DOWN
            ? this.els.searchResults.firstElementChild
            : this.els.searchResults.lastElementChild;
      }
      searchItemToBeSelected.classList.add("selected");
      this.scrollInToView(searchItemToBeSelected);
    }
  }
};

Search.prototype.removeKeyboardNavigation = function(e) {
  let selectedSearchItem = this.els.searchResults.querySelector(
    ".search-item.selected"
  );
  if (selectedSearchItem) {
    selectedSearchItem.classList.remove("selected");
  }
};

Search.prototype.addMouseNavigation = function(e) {
  let hoveredSearchItem, searchItemToBeSelected;
  hoveredSearchItem = this.els.searchResults.querySelector(
    ".search-item.hovered"
  );
  if (hoveredSearchItem) {
    hoveredSearchItem.classList.remove("hovered");
  }
  let { target } = e;
  if (target) {
    if (target.classList.contains("search-item")) {
      searchItemToBeSelected = target;
    } else {
      searchItemToBeSelected = target.closest(".search-item");
    }
    searchItemToBeSelected && searchItemToBeSelected.classList.add("hovered");
  }

  // if (!this.scrollInProgress) {
  //   this.scrollInProgress = true;
  this.scrollInToView(searchItemToBeSelected);
  //}
};

Search.prototype.removeMouseNavigation = function(e) {
  let { target } = e,
    hoveredSearchItem;
  if (target) {
    if (target.classList.contains("hovered")) {
      hoveredSearchItem = target;
    } else {
      hoveredSearchItem = target.closest(".hovered");
    }
    hoveredSearchItem && hoveredSearchItem.classList.remove("hovered");
  }
};

Search.prototype.scrollInToView = function(node) {
  if (node) {
    let self = this;
    let selectedSearchItemRect = node.getBoundingClientRect();
    let searchItemsRect = this.els.searchResults.getBoundingClientRect();

    if (this.els.searchResults.firstElementChild === node) {
      this.els.searchResults.scrollTop = 0;
    } else if (this.els.searchResults.lastElementChild === node) {
      this.els.searchResults.scrollTop =
        this.els.searchResults.scrollHeight -
        this.els.searchResults.clientHeight;
    } else {
      if (selectedSearchItemRect.top >= searchItemsRect.bottom) {
        this.els.searchResults.scrollTop += selectedSearchItemRect.height;
      } else if (selectedSearchItemRect.bottom <= searchItemsRect.top) {
        this.els.searchResults.scrollTop -= selectedSearchItemRect.height;
      } else if (
        selectedSearchItemRect.top <= searchItemsRect.bottom &&
        selectedSearchItemRect.bottom >= searchItemsRect.bottom
      ) {
        this.els.searchResults.scrollTop += selectedSearchItemRect.height;
      } else if (
        selectedSearchItemRect.top <= searchItemsRect.top &&
        selectedSearchItemRect.bottom <= searchItemsRect.bottom
      ) {
        this.els.searchResults.scrollTop -= selectedSearchItemRect.height;
      }
    }

    setTimeout(function() {
      self.els.searchResults.style.pointerEvents = "";
      //self.scrollInProgress = false;
    }, 100);
  }
};

Search.prototype.getNodesForHighlighting = function(node) {
  let textNode,
    textNodeParent = [],
    walk = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Logic to determine whether to accept, reject or skip node
          // Only nodes other than whitespace (spaces, tabs, newlines and Unicode spaces)
          if (!/^\s*$/.test(node.data)) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      },
      false
    );

  while ((textNode = walk.nextNode())) {
    textNodeParent.push(textNode.parentElement);
  }
  return textNodeParent;
};

export default Search;
