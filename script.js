'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const formEdit = document.querySelector('.form--edit');
const inputTypeE = document.querySelector('.form__input--type--edit');
const inputDistanceE = document.querySelector('.form__input--distance--edit');
const inputDurationE = document.querySelector('.form__input--duration--edit');
const inputCadenceE = document.querySelector('.form__input--cadence--edit');
const inputElevationE = document.querySelector('.form__input--elevation--edit');

const sortOrDel = document.querySelector('.sortOrDel');

const btnDelAll = document.querySelector('.btn--delAll');
const btnDelAllConfirm = document.querySelector('.delAllConfirm');
const popup = document.querySelector('.popup');

const btnSort = document.querySelector('.btn--sort');
const sortForm = document.querySelector('.sortForm');
const sortType = document.querySelector('.sort--type');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; //array of [latitude, longitude]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.type = 'running';
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycle1);
///////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //when an object of protoytpe App is created, immediately invoke this method...to bring up the map and mark our location
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    //TOGGLE DIFF INPUT FIELD RUNNING/CYCLING
    inputType.addEventListener('change', this._toggleElevationField);

    //event delegation cuz where does map focus on if there are no registered workouts?
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkouts.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._clickDropDown.bind(this));
    sortOrDel.addEventListener('click', this._delAllWorkouts.bind(this));
    sortOrDel.addEventListener('click', this._sort.bind(this));
    //if no workouts, hide delAll btn and vice versa
    if (this.#workouts.length >= 0) {
      btnDelAll.style.visibility = 'visible';
      btnSort.style.visibility = 'visible';
    }
    if (this.#workouts.length === 0) {
      btnDelAll.style.visibility = 'hidden';
      btnSort.style.visibility = 'hidden';
    }
  }
  //for development purposes only
  _workoutss() {
    return this.#workouts;
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position!');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // console.log(`google.com/maps/@${latitude},${longitude}`);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Displaying a map marker & showing form to input values
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    form.style.display = 'grid';
    inputDistance.focus();
  }

  _hideForm() {
    //CLEAR FORM INPUT AFTER SUBMISSION
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _toggleElevationFieldEdit() {
    inputElevationE.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadenceE.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    //helper function, doesn't allow strings/chars, only numebrs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    //helper function, only allows numbers > 0
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    //Get data from the form
    const workoutType = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout = running, create a Running object and vice versa
    if (workoutType === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid OR positives (if distance,duration,cadence are not numbers OR < 0, return immediately)
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(`Inputs have to be positive numbers!`);
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (workoutType === 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid OR positives(if distance,duration,elevation are not numbers OR < 0, return immediately)
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(`Inputs have to be positive numbers!`);
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to the workout array
    this.#workouts.push(workout);
    //Render workout on map as a marker
    this._renderWorkoutMarker(workout);
    //Render workout on the list
    this._renderWorkout(workout);

    //Hide form + clear input fields
    this._hideForm();

    //Save workouts to local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout-subcontainer">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="collapsible">
          <button class="workout-collapsible">...</button>
          <ul class="collapsible-options">
          <li><button class="buttonEdit">Edit</button></li>
          <li><button class="buttonDelete">Delete</button></li>
          </ul>
        </div>
      </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);
    //if a workout exists, make the delAll button visible
    btnDelAll.style.visibility = 'visible';
    btnSort.style.visibility = 'visible';
  }

  //added this method as a callback function to an .addEventListener to 'containerWorkouts' in the construction function of the APP. Also binded it so that we have access to the #workouts array of the App
  _editWorkouts(e) {
    //make sure the 'EDIT' button was pressed
    if (e.srcElement.className === 'buttonEdit' /*'workout__btn--edit'*/) {
      //copy the #workouts array itself
      const workouts = this.#workouts;
      //get the ID of the workout we are trying to edit
      const workoutID = e.target.closest('.workout').getAttribute('data-id');
      //find the corresponding workout from the #workouts array using ID (changes made will be reflected in original #workouts array)
      const work = workouts.find(el => el.id === workoutID);
      console.log(work);
      //Add the description of the workout to the top of the form to let users know we are trying to edit instead of creating a new workout
      let html = `<div class="form__row--edit">EDIT for ${work.description}</div>`;
      formEdit.insertAdjacentHTML('afterbegin', html);
      formEdit.style.height = '10rem';
      const rowEdit = document.querySelector('.form__row--edit');
      // const formDropDown = document.querySelector('.dropdown');

      rowEdit.style.position = 'absolute';
      // formDropDown.style.position = 'absolute';
      formEdit.style.position = 'relative';
      formEdit.style.display = 'grid';
      rowEdit.style.left = '10px';
      // formDropDown.style.left = '10px';
      //make visible the actual form (for editting, not for new workout)
      formEdit.classList.remove('hidden');
      if (work.type === 'running') {
        inputCadenceE.value = work.cadence;
      }
      if (work.type === 'cycling') {
        this._toggleElevationFieldEdit();
        inputTypeE.value = work.type;
        inputElevationE.value = work.elevationGain;
      }
      inputDistanceE.value = work.distance;
      inputDurationE.value = work.duration;
      //select the workout from the roster (make invisible while editting)
      const workoutLiEl = document.querySelector(`[data-id="${work.id}"]`);
      //hide the workout
      workoutLiEl.style.display = 'none';

      formEdit.addEventListener('submit', function (e) {
        //change values according to workout
        work.type === 'running'
          ? (work.cadence = +inputCadenceE.value)
          : (work.elevationGain = +inputElevationE.value);
        work.distance = +inputDistanceE.value;
        work.duration = +inputDurationE.value;
        //save modified #workouts === workouts to local storage
        localStorage.setItem('workouts', JSON.stringify(workouts));
        //clear edit form values
        inputDistanceE.value =
          inputDurationE.value =
          inputCadenceE.value =
          inputElevationE.value =
            '';
        //hide edit form
        formEdit.style.display = 'none';
        formEdit.classList.add('hidden');
        //show modified workout
        workoutLiEl.style.display = 'grid';
      });
    }
  }

  _deleteWorkout(e) {
    //check if correct button, "del", was pressed
    if (e.srcElement.className === 'buttonDelete' /*`workout__btn--delete`*/) {
      //select the workout using .closest('.workout')
      const workoutEl = e.target.closest('.workout');
      //get the corresponding workout from this.#workouts using ID
      const workout = this.#workouts.find(
        el => el.id === workoutEl.getAttribute('data-id')
      );
      // make a copy of the this.#workouts array (changes made to workouts will now be reflected on this.#workouts)
      const workouts = this.#workouts;
      //find index of workout that should be removed
      const ind = workouts.findIndex(el => el.id === workout.id);
      //use splice to mutate original array, delete only 1 element
      workouts.splice(ind, 1);
      localStorage.setItem('workouts', JSON.stringify(workouts));
      location.reload();
    }
  }

  _delAllWorkouts(e) {
    if (e.target.className === 'btn--delAll') {
      const workouts = this.#workouts;
      popup.classList.add('open-popup');
      btnDelAllConfirm.addEventListener('click', function () {
        workouts.splice(0, workouts.length);
        popup.classList.remove('open-popup');
        localStorage.clear();
        location.reload();
      });
    }
  }

  _sort(e) {
    if (e.target.className === `btn--sort`) {
      sortForm.classList.add('sortFormVisible');
      //that = this bc we need to send in a field to _sortWorkouts, but the field is only given a value after the keypress, ENTER. To call inside of an addEventListener which does not have a callback function which is bound to the class...
      let that = this;
      sortForm.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
          const field = sortType.value;
          if (field === 'distance') {
            that._sortWorkouts(field);
          }
          if (field === 'duration') {
            that._sortWorkouts(field);
          }
        }
      });
    }
  }

  _sortWorkouts(field) {
    if (field === 'distance')
      this.#workouts.sort((a, b) => a.distance - b.distance);
    if (field === 'duration')
      this.#workouts.sort((a, b) => a.duration - b.duration);

    sortForm.classList.remove('sortFormVisible');
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    location.reload();
  }

  _clickDropDown(e) {
    if (
      e.target.className === 'workout-collapsible' ||
      e.target.className === 'workout-collapsible toggle-straightBottomBorder'
    ) {
      console.log(e.target.className);
      //Here, we grab the next sibling of 'workout-collapsible', 'collapsible-options', which is the drop down menu for the corresponding workout. If we chose to use document.querySelector('.collapsible-options'), then the drop-down menu of the FIRST workout will be selected EVERYTIME (instead of the one we want) with no regard to which workout's collapsible button we pressed. This is because for each workout, there is a '.collapsible-options' and the document.querySelector() method will only choose the first one it comes across (which will always exist on the first workout that is listed)
      const collapsibleButton = e.target;
      const collapsibleOptions = e.target.nextElementSibling;
      collapsibleOptions.classList.toggle('toggle-collapsible');
      collapsibleButton.classList.toggle('toggle-straightBottomBorder');
    }
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    //find the workout from the #workouts array by ID
    const workout = this.#workouts.find(el => el.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

//app.reset() to clear localStorage

/* 
ADDITIONAL CHALLENGES

(1) Ability to edit a workout ✅
(2) Ability to delete a workout ✅
(3) Ability to delete all workouts (if no workouts exist, hide button) ✅
(4) Ability to sork workouts by a certain field ✅
(5) Revert objects stored in Local Storage back to their respective classes
(6) Implement more realisitc error and confirmation messages
---
(7) Ability to position the map to show all workouts (zoom-out)
(8) Ability to draw lines and shapes instead of mere pinpoints for workouts
---
(9) Geocode location from coodrinates("Run in Far, Portugal")
(10) Display weather data for workout time and place
*/
