function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function generateRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}

let loaded = false;
let my_username;
let my_weight;
let my_gender;
let users;
let drinks;
let colormap = {};
let bypass = false;  // Set to true to bypass the login form

if (document.cookie.includes("username=") & !bypass) {
    my_username = getCookie('username');
    my_weight = getCookie('weight');
    my_gender = getCookie('gender');
    loaded = true;
    document.getElementById("userFormDiv").style.display = "none";  // Hide the form
    document.getElementById("main").style.display = "block";  // Show the main page

} else {
    // Show the form
    document.getElementById("userFormDiv").style.display = "block";
    document.getElementById("userForm").addEventListener("submit", function(e) {
        e.preventDefault();  // Prevent the form from refreshing the page

        // Save form inputs as cookies
        document.cookie = "username=" + document.getElementById("username").value;
        document.cookie = "weight=" + document.getElementById("weight").value;
        document.cookie = "gender=" + document.getElementById("gender").value;
        my_username = getCookie('username');
        my_weight = getCookie('weight');
        my_gender = getCookie('gender');
        loaded = true;
        document.getElementById("userFormDiv").style.display = "none";  // Hide the form
        document.getElementById("main").style.display = "block";  // Show the main page

        // Get the users' drinks from the server
        drinks = socket.emit('new_user', [my_username, my_weight, my_gender]);
        socket.emit('get_data')
        autoUpdate()
    });
}

function calculateBACOverTime(username, drinks, bodyWeightInKg, gender) {
    const metabolismRate = 0.015;  // 0.015 g/100mL/hour // FIX THIS
    const widmarkFactor = (gender=='male') ? 0.68 : 0.55;
    const bodyWeightInGrams = bodyWeightInKg * 1000;  // Convert kg to grams

    let timeLabels = [];  // To store the time labels for the graph
    let bacValues = [];   // To store the BAC values for the graph

    let totalAlcohol = 0; // To keep track of total alcohol consumed till each drink
    let earliestTime = drinks[0][2];  // Initialize with the time of the first drink

    for (const [volume, strength, time] of drinks) {
        // Calculate the time elapsed since the first drink (in hours)
        const timeElapsed = (time - earliestTime) / 3600;

        // TODO: This still comes up wrong. Fix it or add a fudge factor.
        let old_bac = ((totalAlcohol / (bodyWeightInGrams * widmarkFactor)) * 100) - (metabolismRate * timeElapsed)
        old_bac = old_bac * 0.77777777777;
        if (old_bac < 0) old_bac = 0;  // BAC can't be negative
        timeLabels.push(new Date(time * 1000));
        bacValues.push(old_bac);

        // Calculate the alcohol in the current drink
        const alcoholInGrams = volume * strength * 0.789;  // 0.789 g/cm^3 is the density of ethanol
        totalAlcohol += alcoholInGrams;

        // Calculate BAC at this point
        let bac = ((totalAlcohol / (bodyWeightInGrams * widmarkFactor)) * 100) - (metabolismRate * timeElapsed);
        bac = bac * 0.77777777777;
        if (bac <= 0) bac = 0;  // BAC can't be negative

        // Add time and BAC to the lists
        const timeLabel = new Date(time * 1000);  // Convert Unix time to human-readable format
        timeLabels.push(timeLabel);
        bacValues.push(bac);
    }

    // Add a final point to the graph to show the BAC at current time
    const timeElapsed = (Date.now() / 1000 - earliestTime) / 3600;
    let bac = ((totalAlcohol / (bodyWeightInGrams * widmarkFactor)) * 100) - (metabolismRate * timeElapsed);
    bac = bac * 0.77777777777;
    if (bac < 0) {
        socket.emit('remove_user', username);
        return { timeLabels: [], bacValues: [] };
    }

    timeLabels.push(new Date());
    bacValues.push(bac);

    return { timeLabels, bacValues };
}

function autoUpdate() {
    // Iterate through user data to populate or update datasets
    for (const username in drinks) {
        const user_drinks = drinks[username];
        const weight = users[username][0];
        const gender = users[username][1];

        const { timeLabels, bacValues } = calculateBACOverTime(username, user_drinks, weight, gender);
        if (timeLabels.length == 0) {
            let dataset = myChart.data.datasets.find(d => d.label === username);
            if (dataset) {
                myChart.data.datasets.splice(myChart.data.datasets.indexOf(dataset), 1);
            }
            console.log("Deleted user " + username + " from the graph")
            continue;
        };  // Skip if BAC is negative

        // Check if dataset for user already exists
        let dataset = myChart.data.datasets.find(d => d.label === username);

        if (!dataset) {
            // Create new dataset if not exists
            if (!colormap[username]) {
                colormap[username] = generateRandomColor(); // Your color function
            }

            const newDataset = {
                label: username,
                data: timeLabels.map((time, index) => ({ x: time, y: bacValues[index] })),
                borderColor: colormap[username],
                fill: false,
            };

            myChart.data.datasets.push(newDataset);
        } else {
            // Update existing dataset
            dataset.data = timeLabels.map((time, index) => ({ x: time, y: bacValues[index] }));
        }
    }

    // Finally, update the chart
    myChart.update();

    // Update the leaderboard
    let leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";
    let sorted_users = myChart.data.datasets.map(dataset => dataset.label).sort((a, b) => (myChart.data.datasets.find(ds => ds.label === b).data.slice(-1)[0] || 0) - (myChart.data.datasets.find(ds => ds.label === a).data.slice(-1)[0] || 0));

    for (const username of sorted_users) {
        // Take BAC from the chart
        let bac = myChart.data.datasets.find(dataset => dataset.label === username).data.slice(-1)[0].y;
        let row = document.createElement("div");
        row.className = "row";
        let user_col = document.createElement("div");
        user_col.className = "col";
        user_col.innerHTML = username;
        let bac_col = document.createElement("div");
        bac_col.className = "col";
        bac_col.innerHTML = bac.toFixed(3);
        row.appendChild(user_col);
        row.appendChild(bac_col);
        leaderboard.appendChild(row);

        // Highlight the current user
        if (username == my_username) {
            // Make the row yellow
            row.style.backgroundColor = "#ffc107";
            row.style.color = "#333";

            // Get all the rows in tbody
            let rows = document.querySelectorAll(".table tbody tr");

            // Loop through each row to find the appropriate BAC range
            for (let row of rows) {
                let bacCell = row.cells[0].innerText;
                let [lower, upper] = bacCell.split('–').map(Number);

                // Special case for the last row (BAC > 0.50)
                if (bacCell.startsWith(">")) {
                    lower = parseFloat(bacCell.substr(1));
                    upper = Infinity;
                }

                if (bac >= lower && bac <= upper) {
                    row.style.backgroundColor = "yellow";  // Change to any color you like
                    break;  // Once we find the row, no need to continue the loop
                }
                else {
                    // Alternate between white and grey (grey on odd rows)
                    if (row.rowIndex % 2 == 0) {
                        row.style.backgroundColor = "#fff";
                    } else {
                        row.style.backgroundColor = "#f4f4f4";
                    }
                }
            }
        }
    }

    // Convert the NodeList to an array
    let rows = Array.from(leaderboard.children);

    // Sort the array based on the BAC value
    rows.sort((a, b) => {
        let bacA = parseFloat(a.querySelector('.col:last-child').innerHTML);
        let bacB = parseFloat(b.querySelector('.col:last-child').innerHTML);
        return bacB - bacA; // Sort in descending order
    });

    // Remove all existing rows from the leaderboard
    while (leaderboard.firstChild) {
        leaderboard.removeChild(leaderboard.firstChild);
    }

    // Re-append the sorted rows
    rows.forEach(row => leaderboard.appendChild(row));
}


// Chart initialization
var ctx = document.getElementById('myChart').getContext('2d');
var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: []
    },
    options: {
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute'
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'BAC'
                },
                min: 0,
            }
        },
        responsive: true,
        maintainAspectRatio: true,
    }
});


// Socket.IO setup
var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('connect', function() {
    if (loaded) {
        socket.emit('get_data');
    }
});

socket.on('update_data', function(result) {
    drinks = result[0];
    users = result[1];
});

// Add drink button event
document.getElementById('addDrink').addEventListener('click', function(e) {
    e.preventDefault();
    let volume = document.getElementById('spinbox1').value;
    let strength = document.getElementById('spinbox2').value * 0.01;
    if (volume < 25 || volume > 500 || strength < 0.01 || strength > 0.75) {
        alert("Invalid drink parameters");
        return;
    }

    // Check the button isn't being pressed within 5 seconds of the user's last entry
    // Get the last entry, but first check they have entries at all:
    let user_dataset = myChart.data.datasets.filter(dataset => dataset.label === my_username);
    if (user_dataset.length > 0) {
        let lastEntry = user_dataset[0].data.slice(-1)[0].x.getTime();
        if (Date.now() - lastEntry < 5000) {
            alert("Bro slow down lol");
            return;
        }
    }

    const requestData = {
        'User': my_username,
        'Volume': volume,
        'Strength':strength
    };

    socket.emit('add_drink', requestData);
});

// Auto update every second
setInterval(autoUpdate, 1000);