import { debounce } from "../utils/helper.js";
import * as CONSTANTS from "../utils/constants.js";

const Search = function(elements = {}) {
  this.els = {};
  this.setElements(this.els, elements);
  this.data = [];
  this.searchResults = [];
  this.initialize();
};

Search.prototype.setElements = function(els, elements) {
  let searchElementClass = elements.searchInput || ".search-input";
  let resultsElementClass = elements.results || ".search-results";

  els.searchText = document.querySelector(searchElementClass);
  els.searchResults = document.querySelector(resultsElementClass);
};

Search.prototype.initialize = async function() {
  let self = this;
  let response = await fetch(CONSTANTS.API);
  this.data = await response.json();
  let performSearchBounded = this.performSearch.bind(this);
  let deBouncedPerformSearch = debounce(performSearchBounded);

  let removeMouseNavigationBounded = self.removeMouseNavigation.bind(self);
  document.addEventListener("keyup", function(e) {
    switch (e.keyCode) {
      case 37: //LEFT
      case 38: //UP
        self.addKeyboardNavigation(CONSTANTS.DIRECTION.UP);
        removeMouseNavigationBounded();
        break;
      case 39: //RIGHT
      case 40: //BOTTOM
        self.addKeyboardNavigation(CONSTANTS.DIRECTION.DOWN);
        removeMouseNavigationBounded();
        break;
      default:
        let {
          target: { value: filter }
        } = e;
        deBouncedPerformSearch(filter);
        break;
    }
  });

  this.els.searchResults.addEventListener("mouseover", function(e) {
    let removeKeyboardNavigationBounded = self.removeKeyboardNavigation.bind(
      self
    );
    removeKeyboardNavigationBounded();
    self.addMouseNavigation(e);
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

  function filterUserData(filter) {
    [[...this.data]]
      .map(filterBy.call(self, CONSTANTS.FILTER_COLUMNS.NAME, filter))
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
      <div class="search-item">
      <span class="id">${item.id}</span>
      <span class="name">${item.name}</span>
      <span class="items">${item.items}</span>
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
  let selectedSearchItem,
    sibling,
    firstSearchItem,
    lastSearchItem,
    hoveredSearchItem,
    searchItemToBeSelected;
  if (this.searchResults && this.searchResults.length > 0) {
    selectedSearchItem = this.els.searchResults.querySelector(
      ".search-item.selected"
    );
    if (selectedSearchItem) {
      selectedSearchItem.classList.remove("selected");

      sibling =
        direction === CONSTANTS.DIRECTION.DOWN
          ? selectedSearchItem.nextElementSibling
          : selectedSearchItem.previousElementSibling;

      if (sibling) {
        sibling.classList.add("selected");
      }
      // Selected search item is last child when direction is down or first child when direction is up
      else {
        if (direction === CONSTANTS.DIRECTION.DOWN) {
          searchItemToBeSelected = this.els.searchResults.firstElementChild;
          //searchItemToBeSelected.classList.add("selected");
        } else {
          searchItemToBeSelected = this.els.searchResults.lastElementChild;
          //searchItemToBeSelected.classList.add("selected");
        }
        searchItemToBeSelected.classList.add("selected");
      }
    } else {
      hoveredSearchItem = this.els.searchResults.querySelector(
        ".search-item.hovered"
      );
      if (hoveredSearchItem) {
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

Search.prototype.removeMouseNavigation = function() {
  let hoveredSearchItem = this.els.searchResults.querySelector(
    ".search-item.hovered"
  );
  if (hoveredSearchItem) {
    hoveredSearchItem.classList.remove("hovered");
  }
};

Search.prototype.addMouseNavigation = function(e) {
  let hoveredSearchItem = this.els.searchResults.querySelector(
    ".search-item.hovered"
  );
  if (hoveredSearchItem) {
    hoveredSearchItem.classList.remove("hovered");
  }
  let { target } = e;
  if (target.classList.contains("search-item")) {
    target && target.classList.add("hovered");
  } else {
    let searchItem = target.closest(".search-item");
    searchItem && searchItem.classList.add("hovered");
  }
};

export default Search;
