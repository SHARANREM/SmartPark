// -------------------
// Firebase config
// -------------------
// Your Firebase config (replace with your actual values)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBC3tS6zWgBqRpFWJA_EvHNUH5JovEipIc",
  authDomain: "smartpark-5991c.firebaseapp.com",
  databaseURL: "https://smartpark-5991c-default-rtdb.firebaseio.com",
  projectId: "smartpark-5991c",
  storageBucket: "smartpark-5991c.firebasestorage.app",
  messagingSenderId: "410552122646",
  appId: "1:410552122646:web:935724d02ba7ab75db2437",
  measurementId: "G-WNV8GM1KJX"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// -------------------
// DOM References
// -------------------
const parkingLot = document.getElementById("parkingLot");
let currentType = 1; // default
let slotsData = {};  // will store firebase data

// -------------------
// Load slots from Firebase
// -------------------


// Tech building (type 1)
const parkingRef = ref(db, "parking/slots");
onValue(parkingRef, (snapshot) => {
  if (currentType === 1) {
    slotsData = snapshot.val() || {};
    renderSlots(1);
  }
});

// Hospital (type 2)
const hospitalRef = ref(db, "CCTV_parking/slots");
onValue(hospitalRef, (snapshot) => {
  if (currentType === 2) {
    slotsData = snapshot.val() || {};
    renderSlots(2);
  }
});


// -------------------
// Type Switching
// -------------------
function setType(type) {
  currentType = type;
  parkingLot.className = "parking type" + type;
  renderSlots(type);
}
window.setType = setType; // expose for buttons

// When page loads, get parking type from localStorage
window.addEventListener("DOMContentLoaded", () => {
  const storedType = localStorage.getItem("parking_type");
  if (storedType) {
    setType(Number(storedType));
  }
});


// -------------------
// Render Slots
// -------------------
function renderSlots(type) {
  parkingLot.innerHTML = "";

  if (type === 1) {
    // Tech building slots
    for (let i = 1; i <= 8; i++) {
      const slotKey = "slot" + i;
      const slotInfo = slotsData[slotKey];
      renderSlot(slotKey, slotInfo, "S" + i, true); // true = booking enabled
    }
  }

  else if (type === 2) {
  // Hospital slots
  let entries = Object.entries(slotsData);

  // Sort by the `id` field inside each slot
  entries.sort((a, b) => a[1].id - b[1].id);

  for (let i = 0; i < entries.length; i++) {
    const [slotKey, slotInfo] = entries[i];
    renderSlot(slotKey, slotInfo, "H" + (i + 1), false); // no booking
  }
}


}

function renderSlot(slotKey, slotInfo, labelText, allowBooking) {
  const slot = document.createElement("div");
  slot.className = "slot";

  let img = document.createElement("img");
  let label = document.createElement("span");
  label.textContent = labelText;

  if (slotInfo) {
    if (slotInfo.status === "empty") {
      img.src = "/assets/icons/emptycar.png";
    } else if (slotInfo.status === "occupied") {
      img.src = "/assets/icons/fullcar.png";
    } else if (slotInfo.status === "booked") {
      img.src = "/assets/icons/bookedcar.png";
    } else {
      img.src = "/assets/icons/emptycar.png";
    }
  } else {
    img.src = "/assets/icons/emptycar.png";
  }

  // Only clickable for type 1
  if (allowBooking) {
    slot.addEventListener("click", () => handleSlotClick(slotKey, slotInfo));
  }

  slot.appendChild(img);
  slot.appendChild(label);
  parkingLot.appendChild(slot);
}



function handleSlotClick(slotKey, slotInfo) {
  if (!slotInfo || slotInfo.status === "empty") {
    showBookingPopup(slotKey, slotInfo);
  } else if (slotInfo.status === "booked") {
    const confirmCancel = confirm(`Slot ${slotKey} is booked.\nDo you want to cancel this booking?`);
    if (confirmCancel) {
      const slotRef = ref(db, `parking/slots/${slotKey}`);
      update(slotRef, {
        status: "empty",
        bookedBy: null,
        hours: null,
        totalPrice: null
      }).then(() => {
        alert(`Booking for ${slotKey} has been cancelled.`);
      }).catch((err) => console.error("Cancel failed:", err));
    }
  } else if (slotInfo.status === "occupied") {
    alert("This slot is already full.");
  }
}

// -------------------
// Show Booking Popup
// -------------------
function showBookingPopup(slotKey, slotInfo) {
  const price = parseFloat(localStorage.getItem("parkingPrice")) || 20;
  const vehicle = localStorage.getItem("selectedVehicle") || "car";
  const rates = { car: 2, bike: 1, truck: 3 };

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  // Create popup card
  const card = document.createElement("div");
  card.className = "popup-card";

  card.innerHTML = `
    <h3>Book Slot ${slotKey}</h3>
    <p>Vehicle: <b>${vehicle}</b></p>
    <p>Price per hour: ₹${price * (rates[vehicle] || 1)}</p>
    <label>Hours: <input type="number" id="bookingHours" value="1" min="1"></label>
    <p>Total: ₹<span id="totalPrice">${price * (rates[vehicle] || 1)}</span></p>
    <div class="popup-buttons">
      <button id="confirmBooking">Confirm</button>
      <button id="cancelBooking">Cancel</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Update total on hours change
  const hoursInput = card.querySelector("#bookingHours");
  const totalSpan = card.querySelector("#totalPrice");
  hoursInput.addEventListener("input", () => {
    const hours = parseInt(hoursInput.value, 10) || 1;
    totalSpan.textContent = price * (rates[vehicle] || 1) * hours;
  });

  // Confirm booking
  card.querySelector("#confirmBooking").addEventListener("click", () => {
    const hours = parseInt(hoursInput.value, 10);
    const total = price * (rates[vehicle] || 1) * hours;

    const slotRef = ref(db, `parking/slots/${slotKey}`);
    update(slotRef, {
      status: "booked",
      bookedBy: vehicle,
      hours: hours,
      totalPrice: total
    }).then(() => {
      alert(`Slot ${slotKey} booked!\nVehicle: ${vehicle}\nHours: ${hours}\nTotal: ₹${total}`);
      document.body.removeChild(overlay);
    }).catch((err) => console.error("Booking failed:", err));
  });

  // Cancel popup
  card.querySelector("#cancelBooking").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
}
