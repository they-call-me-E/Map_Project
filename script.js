// Fetch sessionStorage variables
const token = sessionStorage.getItem('token');
const userName = sessionStorage.getItem('name');
const userAvatar = sessionStorage.getItem('avatar');
console.log("Avatar URL from sessionStorage:", userAvatar);
const markers = {}; // Object to store markers by member ID
const groupId = localStorage.getItem('GroupId');

console.log("Retrieved GroupUUID from localStorage:", groupId);



mapboxgl.accessToken = "pk.eyJ1IjoidGhleWNhbGxtZWUiLCJhIjoiY2xhZXF6anQxMHgzazNxczNzd2I5em10dyJ9.fa-pBQ_2cMg9H2fD-FBCDg";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v10",
  center: [-82.04842360357094, 35.18969231143789],
  zoom: 8,
});

// map.on("load", () => {
//   console.log("Map loaded");

//   // Show loading spinner and fetch data
//   showLoadingSpinner();
//   // Fetch dropdown data first before other tasks
//   fetchDropdownData()
//   fetchFenceData()
//     .then(() => fetchmembersData())
//     .finally(() => hideLoadingSpinner());

//   // Update profile section with sessionStorage values
//   if (userName) {
//     document.getElementById('profileName').innerText = userName;
//   }
//   if (userAvatar) {
//     const avatarImg = document.querySelector('.profile-img');
//     console.log("Profile image element:", avatarImg);

//     if (avatarImg) { // Ensure avatarImg is found before trying to set its src
//       console.log("Setting profile image source to:", userAvatar);
//       avatarImg.src = userAvatar;
//     } else {
//       console.error("Profile image element not found!");
//     }
//   } else {
//     console.log("No user avatar available.");
//   }

// }); 

// Show loading spinner

map.on("load", () => {
  console.log("Map loaded");

  // Show loading spinner and fetch data
  showLoadingSpinner();

  // Fetch dropdown data first before other tasks
  fetchDropdownData()
    .then(() => {
      if (groupId) {
        console.log("GroupId found, fetching fence and member data...");
        return fetchFenceData()
          .then(() => fetchmembersData());
      } else {
        console.log("No GroupId found, skipping fence and member data fetch.");
        return Promise.resolve(); // Do nothing if no groupId is present
      }
    })
    .finally(() => hideLoadingSpinner());

  // Update profile section with sessionStorage values
  if (userName) {
    document.getElementById('profileName').innerText = userName;
  }
  if (userAvatar) {
    const avatarImg = document.querySelector('.profile-img');
    console.log("Profile image element:", avatarImg);

    if (avatarImg) { // Ensure avatarImg is found before trying to set its src
      console.log("Setting profile image source to:", userAvatar);
      avatarImg.src = userAvatar;
    } else {
      console.error("Profile image element not found!");
    }
  } else {
    console.log("No user avatar available.");
  }
});


function showLoadingSpinner() {
  document.getElementById("loadingSpinner").style.display = "block";
}

// Hide loading spinner
function hideLoadingSpinner() {
  document.getElementById("loadingSpinner").style.display = "none";
}

async function fetchFenceData() {
  console.log("Fetching geofence data...");

  // Check if groupId exists before making the API call
  if (!groupId) {
    console.error("GroupId not found in localStorage! Skipping geofence data fetch.");
    return; // Exit the function if no GroupId is available
  }

  try {
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/groups/${groupId}/fences`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from sessionStorage
        },
      }
    );

    const rawResponse = await response.text();
    console.log("Raw API response:", rawResponse);

    const data = JSON.parse(rawResponse);
    console.log("Fence data fetched:", data);

    if (data && data.document) {
      data.document.forEach((geofence) => {
        addGeofence(geofence);
      });
    } else {
      console.error("Geofence data structure is incorrect:", data);
    }
  } catch (error) {
    console.error("Error fetching geofence data:", error);
  }
}



// Add geofence to the map
function addGeofence(geofence) {
  const center = [geofence.longitude, geofence.latitude];
  const radiusInMeters = parseFloat(geofence.radius);
  const options = { steps: 64, units: "meters" };
  const circle = turf.circle(center, radiusInMeters, options);

  // Add a filled circle for the geofence
  map.addLayer({
    id: geofence.uuid,
    type: "fill",
    source: {
      type: "geojson",
      data: circle,
    },
    paint: {
      "fill-color": "#007cbf",
      "fill-opacity": 0.25,
    },
  });

  // Add a marker at the center of the geofence
  const defaultMarker = new mapboxgl.Marker({
    anchor: "bottom",
    offset: [0, 24],
  });
  defaultMarker.setLngLat(center).addTo(map);

  // Add an outer circle to represent the radius visually
  map.addLayer({
    id: geofence.uuid + "-circle",
    type: "circle",
    source: {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: center },
      },
    },
    paint: {
      "circle-radius": 22,
      "circle-color": "#FFFFFF",
      "circle-opacity": 1,
    },
  });
}


async function fetchmembersData() {
  console.log("Fetching members data...");

  // Retrieve the GroupId from localStorage
  getGroupId();
  console.log("Using this groupId: ", groupId);

  // Check if groupId exists
  if (!groupId) {
    console.error("GroupId not found in localStorage!");
    return; // Exit the function if no GroupId is available
  }

  try {
    // Use backticks for template literal
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/groups/${groupId}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from sessionStorage
        },
      }
    );

    const rawText = await response.text();
    console.log("Response as plain text:", rawText);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${response.statusText}`
      );
    }

    const data = JSON.parse(rawText);

    if (data && data.document && Array.isArray(data.document.members)) {
      data.document.members.forEach((member) => {
        const bgColor = getRandomColor();
        addMemberToMenu(member, bgColor);
        addMemberMarker(member, bgColor);
      });
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching members data:", error);
  }
}


// Add member to the slide-out menu
function addMemberToMenu(memberData, bgColor) {
  const membersDiv = document.getElementById("membersDiv");

  // Create a member box
  const memberBox = document.createElement("div");
  memberBox.className = "member-box";

  // Create the avatar/initials circle
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "member-avatar";

  if (memberData.avatar) {
    // If an avatar exists, create an image element and set the source
    const img = document.createElement("img");
    img.src = memberData.avatar;
    avatarDiv.appendChild(img);
  } else {
    // If no avatar, show the initials inside a circle
    const initialsDiv = document.createElement("div");
    initialsDiv.textContent = getInitials(memberData.name); // Generate initials from the name
    initialsDiv.style.backgroundColor = bgColor; // Set background color dynamically
    initialsDiv.style.height = "90%";
    initialsDiv.style.width = "90%";
    initialsDiv.style.borderRadius = "9999px";
    initialsDiv.style.display = "flex";
    initialsDiv.style.alignItems = "center";
    initialsDiv.style.justifyContent = "center";
    initialsDiv.style.fontSize = "1.5em";
    initialsDiv.style.color = "#fff"; // Text color for initials
    avatarDiv.appendChild(initialsDiv); // Append initials to avatarDiv
  }


  // Add the avatar/initials to the member box
  memberBox.appendChild(avatarDiv);

  // Add member name and coordinates
  const infoDiv = document.createElement("div");
  infoDiv.innerHTML = `
                <div class="member-name">${memberData.name}</div>
                <div class="gps-coordinates">Lat: ${memberData.location.latitude}, Long: ${memberData.location.longitude}</div>
            `;
  memberBox.appendChild(infoDiv);

  // Append the member box to the members div
  membersDiv.appendChild(memberBox);

  // Add click event to fly to the member's marker location
  memberBox.addEventListener("click", function () {
    console.log("FLyto");
    const lat = memberData.location.latitude;
    const lng = memberData.location.longitude;
    map.flyTo({
      center: [lng, lat],
      zoom: 12,
      essential: true,
    });
  });
}


// Add member marker to the map with expandable rectangle on click and badge
function addMemberMarker_bak(memberData, bgColor) {
  // Dummy data for testing
  const isMovingTest = true; // Simulate that the member is moving
  const speedTest = 10; // Simulate speed over 5 mph

  // Use actual data if available, otherwise fallback to dummy data
  const { latitude, longitude } = memberData.location;
  const is_moving = memberData.is_moving !== undefined ? memberData.is_moving : isMovingTest;
  const speed = memberData.location.speed !== undefined ? memberData.location.speed : speedTest;
  const memberId = memberData.uuid || memberData._id; // Assuming memberData contains a unique ID

  if (!latitude || !longitude) {
    console.error("Missing latitude or longitude for member:", memberData);
    return;
  }

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Update the existing marker's position and badge
    console.log(`Marker position updated to: Lat: ${latitude}, Long: ${longitude}`);

    const markerEl = markers[memberId].getElement();

    // Update marker location
    markers[memberId].setLngLat([longitude, latitude]);

    // Update badge if member is moving and speed > 5
    const badgeDiv = markerEl.querySelector(".badge");
    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not already present
        console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

        const newBadgeDiv = document.createElement("div");
        newBadgeDiv.classList.add("badge");

        const badgeImg = document.createElement("img");
        badgeImg.src = "https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/driving.png";

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("badge-speed");
        speedSpan.textContent = `${speed} mph`;

        newBadgeDiv.appendChild(badgeImg);
        newBadgeDiv.appendChild(speedSpan);
        markerEl.appendChild(newBadgeDiv);
      } else {
        // Update existing badge with new speed
        console.log(`Updating badge for member: ${memberData.name} with new speed: ${speed} mph`);

        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(`Removing badge for member: ${memberData.name} (No longer moving or speed <= 5)`);

      badgeDiv.remove();
    }
  } else {
    // Create a new marker if one doesn't exist
    console.log(`Creating new marker for member: ${memberData.name} (ID: ${memberId})`);

    const el = document.createElement("div");
    el.className = "marker";

    const circleDiv = document.createElement("div");
    circleDiv.classList.add("circle-div");

    if (memberData.avatar) {
      const avatarImg = document.createElement("img");
      avatarImg.src = memberData.avatar;
      circleDiv.appendChild(avatarImg); // Add avatar image inside the circle
    } else {
      const innerCircle = document.createElement("div");
      innerCircle.classList.add("circle-inner");
      innerCircle.style.backgroundColor = bgColor;
      const initialsDiv = document.createElement("div");
      initialsDiv.textContent = getInitials(memberData.name);
      innerCircle.appendChild(initialsDiv);
      circleDiv.appendChild(innerCircle);
    }

    el.appendChild(circleDiv);

    // Add badge if speed > 5
    if (is_moving && speed > 5) {
      console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge");

      const badgeImg = document.createElement("img");
      badgeImg.src = "https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/driving.png";

      const speedSpan = document.createElement("span");
      speedSpan.classList.add("badge-speed");
      speedSpan.textContent = `${speed} mph`;

      badgeDiv.appendChild(badgeImg);
      badgeDiv.appendChild(speedSpan);
      el.appendChild(badgeDiv);
    }

    const marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    markers[memberId] = marker; // Store the marker by member ID
    console.log(`Marker created for member: ${memberData.name} at Lat: ${latitude}, Long: ${longitude}`);

  }
}

// Add member marker to the map with expandable rectangle on click and badge
function addMemberMarkerv1(memberData, bgColor) {
  // Dummy data for testing
  const isMovingTest = true; // Simulate that the member is moving
  const speedTest = 10; // Simulate speed over 5 mph

  // Use actual data if available, otherwise fallback to dummy data
  const { latitude, longitude } = memberData.location;
  const is_moving = memberData.is_moving !== undefined ? memberData.is_moving : isMovingTest;
  const speed = memberData.location.speed !== undefined ? memberData.location.speed : speedTest;
  const memberId = memberData.uuid || memberData._id; // Assuming memberData contains a unique ID

  if (!latitude || !longitude) {
    console.error("Missing latitude or longitude for member:", memberData);
    return;
  }

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Update the existing marker's position and badge
    console.log(`Marker position updated to: Lat: ${latitude}, Long: ${longitude}`);

    const markerEl = markers[memberId].getElement();

    // Update marker location
    markers[memberId].setLngLat([longitude, latitude]);

    // Update badge if member is moving and speed > 5
    const badgeDiv = markerEl.querySelector(".badge");
    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not already present
        console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

        const newBadgeDiv = document.createElement("div");
        newBadgeDiv.classList.add("badge");

        const badgeImg = document.createElement("img");
        badgeImg.src = "https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/driving.png";

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("badge-speed");
        speedSpan.textContent = `${speed} mph`;

        newBadgeDiv.appendChild(badgeImg);
        newBadgeDiv.appendChild(speedSpan);
        markerEl.appendChild(newBadgeDiv);
      } else {
        // Update existing badge with new speed
        console.log(`Updating badge for member: ${memberData.name} with new speed: ${speed} mph`);
        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(`Removing badge for member: ${memberData.name} (No longer moving or speed <= 5)`);
      badgeDiv.remove();
    }
  } else {
    // Create a new marker if one doesn't exist
    console.log(`Creating new marker for member: ${memberData.name} (ID: ${memberId})`);

    const el = document.createElement("div");
    el.className = "marker";

    const circleDiv = document.createElement("div");
    circleDiv.classList.add("circle-div");

    // If the member has an avatar, show it; otherwise, show initials
    if (memberData.avatar) {
      const avatarImg = document.createElement("img");
      avatarImg.src = memberData.avatar || 'path/to/default-avatar.png'; // Add fallback to default avatar
      circleDiv.appendChild(avatarImg); // Add avatar image inside the circle
    } else {
      // If no avatar, show the initials inside a circle
      const innerCircle = document.createElement("div");
      innerCircle.classList.add("circle-inner");
      innerCircle.style.backgroundColor = bgColor; // Set background color dynamically

      const initialsDiv = document.createElement("div");
      initialsDiv.textContent = getInitials(memberData.name); // Generate initials from the name

      innerCircle.appendChild(initialsDiv);
      circleDiv.appendChild(innerCircle);
    }

    el.appendChild(circleDiv);

    // Add badge if speed > 5
    if (is_moving && speed > 5) {
      console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge");

      const badgeImg = document.createElement("img");
      badgeImg.src = "https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/driving.png";

      const speedSpan = document.createElement("span");
      speedSpan.classList.add("badge-speed");
      speedSpan.textContent = `${speed} mph`;

      badgeDiv.appendChild(badgeImg);
      badgeDiv.appendChild(speedSpan);
      el.appendChild(badgeDiv);
    }

    const marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    markers[memberId] = marker; // Store the marker by member ID
    console.log(`Marker created for member: ${memberData.name} at Lat: ${latitude}, Long: ${longitude}`);
  }
}

function addMemberMarker(memberData, bgColor) {
  const { latitude, longitude } = memberData.location;
  const is_moving = memberData.is_moving !== undefined ? memberData.is_moving : true; // Assume moving if undefined
  const speed = memberData.location.speed !== undefined ? memberData.location.speed : 10; // Default speed if undefined
  const memberId = memberData.uuid || memberData._id; // Unique member ID

  if (!latitude || !longitude) {
    console.error("Missing latitude or longitude for member:", memberData);
    return;
  }

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Update existing marker position and badge
    console.log(`Marker position updated: Lat: ${latitude}, Long: ${longitude}`);
    const markerEl = markers[memberId].getElement();

    // Update marker location
    markers[memberId].setLngLat([longitude, latitude]);

    // Update badge if moving and speed > 5
    const badgeDiv = markerEl.querySelector(".badge");
    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not present
        console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

        const newBadgeDiv = document.createElement("div");
        newBadgeDiv.classList.add("badge");

        const badgeImg = document.createElement("img");
        badgeImg.src = "https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/driving.png";

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("badge-speed");
        speedSpan.textContent = `${speed} mph`;

        newBadgeDiv.appendChild(badgeImg);
        newBadgeDiv.appendChild(speedSpan);
        markerEl.appendChild(newBadgeDiv);
      } else {
        // Update badge with new speed
        console.log(`Updating badge for member: ${memberData.name} with speed: ${speed} mph`);
        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(`Removing badge for member: ${memberData.name} (Speed <= 5 mph)`);
      badgeDiv.remove();
    }
  } else {
    // Create a new marker if one doesn't exist
    console.log(`Creating new marker for member: ${memberData.name}`);

    const el = document.createElement("div");
    el.className = "marker";

    const circleDiv = document.createElement("div");
    circleDiv.classList.add("circle-div");

    // If the member has an avatar, show it; otherwise, show initials
    if (memberData.avatar) {
      const avatarImg = document.createElement("img");
      avatarImg.src = memberData.avatar || 'path/to/default-avatar.png';
      circleDiv.appendChild(avatarImg);
    } else {
      // If no avatar, show initials
      const innerCircle = document.createElement("div");
      innerCircle.classList.add("circle-inner");
      innerCircle.style.backgroundColor = bgColor;

      const initialsDiv = document.createElement("div");
      initialsDiv.textContent = getInitials(memberData.name);

      innerCircle.appendChild(initialsDiv);
      circleDiv.appendChild(innerCircle);
    }

    el.appendChild(circleDiv);

    // Add badge if moving and speed > 5
    if (is_moving && speed > 5) {
      console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge");

      const badgeImg = document.createElement("img");
      badgeImg.src = "https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/driving.png";

      const speedSpan = document.createElement("span");
      speedSpan.classList.add("badge-speed");
      speedSpan.textContent = `${speed} mph`;

      badgeDiv.appendChild(badgeImg);
      badgeDiv.appendChild(speedSpan);
      el.appendChild(badgeDiv);
    }

    // Create the expanded view (initially hidden)
    const expandedDiv = document.createElement("div");
    expandedDiv.classList.add("marker-expanded");
    expandedDiv.style.display = "none"; // Initially hidden

    const expandedCircleDiv = circleDiv.cloneNode(true);
    expandedDiv.appendChild(expandedCircleDiv);

    // Add content to the expanded marker
    const content = `
      <div class="content">
        <strong>${memberData.name}</strong><br>
        Location: ${memberData.address || 'N/A'}<br>
        Battery: ${memberData.battery || 'N/A'}%<br>
        Wi-Fi: ${memberData.wifi ? 'On' : 'Off'}
      </div>
      <button class="close-btn">&times;</button>
    `;
    expandedDiv.innerHTML += content;
    expandedDiv.querySelector('.close-btn').style.display = "block"; // Show close button

    el.appendChild(expandedDiv); // Add expanded view to marker

    // Add the marker to the map
    const marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    markers[memberId] = marker; // Store marker by member ID

    // Marker click event to fly to location and toggle expansion
    el.addEventListener("click", function () {
      console.log(`Marker clicked: ${memberData.name}`);

      // Fly to the marker location
      map.flyTo({
        center: [longitude, latitude],
        zoom: 12, // Adjust zoom level as needed
        essential: true,
      });

      // Toggle expansion of the marker
      if (expandedDiv.style.display === "none") {
        expandedDiv.style.display = "block";
        circleDiv.style.display = "none";
      } else {
        expandedDiv.style.display = "none";
        circleDiv.style.display = "flex";
      }
    });

    // Close button event to collapse the expanded marker
    expandedDiv.querySelector(".close-btn").addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the event from bubbling
      expandedDiv.style.display = "none"; // Hide expanded view
      circleDiv.style.display = "flex"; // Show circular marker again
    });
  }
}

// Toggle the menu open
document
  .getElementById("toggle-menu")
  .addEventListener("click", function () {
    document.body.classList.add("menu-open");
  });

// Close the menu with the close button
document
  .getElementById("close-menu")
  .addEventListener("click", function () {
    document.body.classList.remove("menu-open");
  });

// Toggle the hidden members div with dynamic height
document
  .getElementById("members-btn")
  .addEventListener("click", function () {
    const membersDiv = document.getElementById("membersDiv");
    if (membersDiv.style.maxHeight) {
      membersDiv.style.maxHeight = null;
      membersDiv.classList.remove("open", "open-scroll"); // Close the div and remove scroll

    } else {
      // membersDiv.style.maxHeight = membersDiv.scrollHeight + "px";
      membersDiv.style.maxHeight = "275px";
      membersDiv.classList.add("open");

      // Wait for the transition to complete before enabling scrolling
      membersDiv.addEventListener(
        "transitionend",
        function () {
          membersDiv.classList.add("open-scroll");
        },
        { once: true }
      );
    }
    const membersCon = document.getElementById("membersCon");
    if (membersCon.style.maxHeight) {
      membersCon.style.maxHeight = null;
      membersCon.classList.remove("open"); // Close the div and remove scroll
    } else {
      // membersDiv.style.maxHeight = membersDiv.scrollHeight + "px";
      membersCon.style.maxHeight = "320px";
      membersCon.classList.add("open");
    }
  });


// Generate random color for initials background
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Generate initials from name
function getInitials(name) {
  const nameParts = name.split(" ");
  const initials =
    nameParts[0].charAt(0).toUpperCase() +
    (nameParts[1] ? nameParts[1].charAt(0).toUpperCase() : "");
  return initials;
}

document.querySelector('.back-arrow').addEventListener('click', function () {
  // Add a class to hide the menu (e.g., sliding it out)
  document.querySelector('.profile-menu').classList.remove('profile-menu-open');
});
document.querySelector('#profile-button').addEventListener('click', function () {
  document.querySelector('.profile-menu').classList.add('profile-menu-open');
});

document.querySelector('#profileName').addEventListener('click', function () {
  const profileNameDiv = this;
  const currentName = profileNameDiv.innerText;

  // Create an input field for editing
  const inputField = document.createElement('input');
  inputField.type = 'text';
  inputField.value = currentName;
  inputField.classList.add('profile-name-input'); // Add a class for styling if needed

  // Replace the div with the input field
  profileNameDiv.replaceWith(inputField);
  inputField.focus();

  // Handle when the user finishes editing (e.g., pressing Enter or clicking outside)
  function saveName() {
    const updatedName = inputField.value;

    // Create a new div with the updated name
    const newProfileNameDiv = document.createElement('div');
    newProfileNameDiv.innerText = updatedName;
    newProfileNameDiv.classList.add('profile-name');
    newProfileNameDiv.id = 'profileName';

    // Replace the input field with the new div
    inputField.replaceWith(newProfileNameDiv);

    // Re-apply the event listener for future editing
    newProfileNameDiv.addEventListener('click', arguments.callee);
  }

  // Save on Enter key press
  inputField.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      saveName();
    }
  });

  // Save on losing focus (clicking outside)
  inputField.addEventListener('blur', saveName);
});

// Toggle dropdown visibility
function toggleDropdown() {
  const dropdown = document.getElementById('customDropdown');
  dropdown.classList.toggle('open'); // Toggle the 'open' class

  // Highlight the currently selected item (pass the selected value)
  const selectedName = document.getElementById('dropdownButton').textContent; // Get current selection from the button
  highlightSelectedItem(selectedName);
}

// Highlight the currently selected item in the dropdown
function highlightSelectedItem(selectedName) {
  const dropdownItems = document.querySelectorAll('.dropdown-item');

  dropdownItems.forEach(item => {
    const itemName = item.querySelector('span').textContent;
    if (itemName === selectedName) {
      item.classList.add('selected-item');
    } else {
      item.classList.remove('selected-item');
    }
  });
}


// Select an item from the dropdown
function selectItem(element) {
  const selectedName = element.querySelector("span").textContent;
  const selectedValue = element.getAttribute("data-value"); // UUID

  // Save the GroupUUID in localStorage for persistence across sessions
  localStorage.setItem("GroupId", selectedValue);

  // Update the button text with the selected name
  document.getElementById('dropdownButton').textContent = selectedName;

  // Remove or comment these lines if those elements don't exist in the HTML
  // document.getElementById("selectedName").textContent = selectedName;
  // document.getElementById("selectedValue").textContent = selectedValue;

  // Close the dropdown after selection
  toggleDropdown();

  console.log("GroupId saved in localStorage:", selectedValue);
}



// Edit item function
function editItem(itemName) {
  event.stopPropagation(); // Prevent dropdown from closing when editing
  const newName = prompt("Edit the item name:", itemName);
  if (newName) {
    const dropdownItems = document.querySelectorAll(".dropdown-item span");
    dropdownItems.forEach(item => {
      if (item.textContent === itemName) {
        item.textContent = newName;
      }
    });
    alert(`${itemName} changed to ${newName}`);
  }
}

// Delete item function
function deleteItem(itemName) {
  event.stopPropagation(); // Prevent dropdown from closing when deleting
  if (confirm(`Are you sure you want to delete ${itemName}?`)) {
    const dropdownItems = document.querySelectorAll(".dropdown-item");
    dropdownItems.forEach(item => {
      if (item.querySelector("span").textContent === itemName) {
        item.remove();
      }
    });
    alert(`${itemName} deleted`);
  }
}

// Add new item to the dropdown
// Add new item to the dropdown
function addNewItem() {
  const newItemName = document.getElementById("newItemName").value;
  const newItemUUID = generateUUID();  // Generate a new UUID for the item
  if (newItemName.trim() !== "") {
    const dropdown = document.getElementById("dropdownItems");
    const footer = document.querySelector('.dropdown-footer'); // Get the footer

    // Create a new dropdown item dynamically
    const newItem = document.createElement("div");
    newItem.classList.add("dropdown-item");
    newItem.setAttribute("data-value", newItemUUID);  // Assign UUID as data-value
    newItem.setAttribute("onclick", "selectItem(this)");  // Add click handler

    const newItemText = document.createElement("span");
    newItemText.textContent = newItemName;

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.onclick = function (event) {
      event.stopPropagation();
      editItem(newItemName);
    };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function (event) {
      event.stopPropagation();
      deleteItem(newItemName);
    };

    newItem.appendChild(newItemText);
    newItem.appendChild(editButton);
    newItem.appendChild(deleteButton);

    // Insert the new item before the footer
    dropdown.insertBefore(newItem, footer);

    // Clear input field after adding the item
    document.getElementById("newItemName").value = "";
  } else {
    alert("Please enter a valid item name.");
  }
}
// Function to generate a new UUID (for simplicity)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to handle the "Create" button click
function createItem() {
  alert('Create button clicked');
}

// Function to handle the "Join" button click
function joinItem() {
  alert('Join button clicked');
}

// Function to fetch dropdown data from API and populate the dropdown
async function fetchDropdownData() {
  console.log("Fetching group data...");

  try {
    const response = await fetch("https://group-api-b4pm.onrender.com/api/groups/", {
      headers: {
        Authorization: `Bearer ${token}`, // Use token from sessionStorage
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Group data fetched:", data);

    if (data && data.document && Array.isArray(data.document)) {
      populateDropdown(data.document); // Call function to populate dropdown with group data
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching group data:", error);
  }
}

// Function to populate the dropdown with fetched group data
function populateDropdown(groups) {
  const dropdownItems = document.getElementById("dropdownItems");
  dropdownItems.innerHTML = ''; // Clear existing items

  groups.forEach(group => {
    const newItem = document.createElement("div");
    newItem.classList.add("dropdown-item");
    newItem.setAttribute("data-value", group.uuid); // Use the group UUID
    newItem.setAttribute("onclick", "selectItem(this)");  // Add click handler

    const newItemText = document.createElement("span");
    newItemText.textContent = group.name; // Display the group name

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.onclick = function (event) {
      event.stopPropagation();
      editItem(group.name);
    };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function (event) {
      event.stopPropagation();
      deleteItem(group.name);
    };

    newItem.appendChild(newItemText);
    newItem.appendChild(editButton);
    newItem.appendChild(deleteButton);

    // Append the new item to the dropdown
    dropdownItems.appendChild(newItem);
    initializeDropdown();
  });
}

// Call the function to fetch data and populate the dropdown when the page loads
document.addEventListener("DOMContentLoaded", function () {
  fetchDropdownData();
});

// Function to initialize the dropdown and select the corresponding group based on GroupId
function initializeDropdown() {
  // Retrieve GroupId from localStorage
  getGroupId();

  // Check if a GroupId exists in localStorage
  if (groupId) {
    console.log("GroupId found in localStorage:", groupId);

    // Find the dropdown item that matches the stored GroupId
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    let matchFound = false;  // Flag to check if match is found

    dropdownItems.forEach(item => {
      const itemValue = item.getAttribute('data-value');

      if (itemValue === groupId) {
        // Set this item as selected in the dropdown
        const selectedName = item.querySelector('span').textContent;
        document.getElementById('dropdownButton').textContent = selectedName; // Update button text
        console.log("Selected item:", selectedName);

        // Optionally, highlight the selected item in the dropdown list
        item.classList.add('selected-item');
        matchFound = true;
      } else {
        item.classList.remove('selected-item');
      }
    });

    // If no match is found, you can handle it (e.g., set a default group or log an error)
    if (!matchFound) {
      console.log("No matching GroupId found in dropdown items.");
    }
  } else {
    console.log("No GroupId found in localStorage.");
  }
}

// Call this function after the dropdown items are populated
document.addEventListener("DOMContentLoaded", () => {
  // Ensure dropdown is populated before calling this
  initializeDropdown();
});

function getGroupId() {
  const groupId = localStorage.getItem('GroupId');
  if (!groupId) {
    console.error("GroupId not found in localStorage!");
  }
  return groupId;
}

// setInterval(() => {
//   fetchmembersData(); // Fetch and update members data every 30 seconds
// }, 30000); // 30 seconds
