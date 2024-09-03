import { User } from "../js/user.js"

function getCookie(name) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length > 1) {
        return parts[1].split(';').shift()
    }
}

function generateRandomColour() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}

let me, drinks
let userBACs = {}
let socket
let colourmap = {}
let timeLabels = []
let bacValues = []

function getOrSetUserInformation() {
    if (document.cookie.includes("username=")) {
        console.log("Found username")
        me = new User(getCookie('username'), getCookie('weight'), getCookie('sex'),
            getCookie('room'))
        document.getElementById("userFormDiv").style.display = "none";
        document.getElementById("main").style.display = "block";
    } else {
        console.log("No username found")
        document.getElementById("userFormDiv").style.display = "block";
        document.getElementById("userForm").addEventListener("submit", function(e) {
            e.preventDefault()

            document.cookie = "username=" + document.getElementById("username").value;
            let myUsername = document.getElementById("username").value;
            document.cookie = "weight=" + document.getElementById("weight").value;
            let myWeight = Math.ceil(parseFloat(document.getElementById("weight").value));
            document.cookie = "sex=" + document.getElementById("sex").value;
            let mySex = document.getElementById("sex").value;
            document.cookie = "room=" + document.getElementById("room").value;
            let myRoom = document.getElementById("room").value || "Global";

            me = new User(myUsername, myWeight, mySex, myRoom, 0.0, generateRandomColour())
            let payload = {
                cmd: "new user",
                data: me
            }
            socket.send(JSON.stringify(payload));

            document.getElementById("userFormDiv").style.display = "none";
            document.getElementById("main").style.display = "block";
        })

        //TODO initialise connection to WS server
    }
    document.getElementById("addDrink").addEventListener("click", function(e) {
        e.preventDefault()
        let volume = parseFloat(document.getElementById("volume").value)
        let strength = parseFloat(document.getElementById("strength").value)
        let drink = {
            "volume": volume,
            "strength": strength,
            "name": me.name,
            "weight": parseFloat(me.weight),
            "sex": me.sex,
            "bac": me.bac || 0
        }

        let payload = {
            cmd: "new drink",
            data: drink
        }
        socket.send(JSON.stringify(payload));
    })
}

function initPage() {
    const wsUrl = `ws://${document.domain}:5001/ws`
    socket = new WebSocket(wsUrl);
    socket.onopen = function() {
        console.log("Websocket opened");
        socket.send("init")
        socket.addEventListener("message", function(e) {
            const jsonData = JSON.parse(e.data);
            //console.warn(jsonData)
            for (let i = 0; i < jsonData.length; i++) {
                if (jsonData[i].cmd === "updateBAC") {
                    let now = moment().format('YYYY-MM-DDTHH:mm:ss');
                    timeLabels.push(now);  // This is in ISO 8601 format
                    let data = jsonData[i].data;
                    let entries = Object.entries(data);
                    entries.sort((a, b) => b[1] - a[1]);
                    let sortedData = Object.fromEntries(entries);
                    bacValues.push(sortedData)
                    let leaderboard = document.getElementById("leaderboard");
                    leaderboard.innerHTML = "";
                    for (const [key, value] of Object.entries(sortedData)) {
                        if (!userBACs[key]) {
                            userBACs[key] = [];
                        }
                        userBACs[key].push(value);

                        if (userBACs[key].length < timeLabels.length) {
                            let paddedArray = Array(timeLabels.length).fill(null);
                            let startIndex = timeLabels.length - userBACs[key].length;
                            for (let i = 0; i < userBACs[key].length; i++) {
                                paddedArray[startIndex + i] = userBACs[key][i];
                            }
                            userBACs[key] = paddedArray;
                        }

                        let dataset = myChart.data.datasets.find(dataset => dataset.label === key);
                        if (!dataset) {
                            if (!colourmap[key]) {
                                colourmap[key] = generateRandomColour();
                            }
                            const newDataset = {
                                label: key,
                                data: timeLabels.map((time, index) => ({x: time, y: userBACs[key][index]})),
                                borderColor: colourmap[key],
                                fill: false,
                                pointRadius: 0
                            }

                            myChart.data.datasets.push(newDataset);
                        } else {
                            dataset.data = timeLabels.map((time, index) => ({x: time, y: userBACs[key][index]}))
                        }

                        myChart.update()

                        let row = document.createElement("div")
                        row.className = "row";
                        let user_col = document.createElement("div");
                        user_col.className = "col";
                        user_col.innerHTML = key;
                        let bac_col = document.createElement("div");
                        bac_col.className = "col";
                        bac_col.innerHTML = value.toFixed(3);
                        row.appendChild(user_col);
                        row.appendChild(bac_col);
                        leaderboard.appendChild(row);

                        if (key === me.name) {
                            row.style.backgroundColor = "#ffc107";
                            row.style.color = "#333";
                            let rows = document.querySelectorAll(".table tbody tr");
                            me.bac = value
                            // Loop through each row to find the appropriate BAC range
                            for (let row of rows) {
                                let bacCell = row.cells[0].innerText;
                                let [lower, upper] = bacCell.split('–').map(Number);
                                upper += 0.001

                                // Special case for the last row (BAC > 0.50)
                                if (bacCell.startsWith(">")) {
                                    lower = parseFloat(bacCell.substr(1));
                                    upper = Infinity;
                                }
                                if (value >= lower && value <= upper) {
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
                    myChart.update()
                }
            }
        })
    }
    getOrSetUserInformation()
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
                        unit: 'second',
                        displayFormats: {
                            second: 'h:mm:ss a',
                        }
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
    })
}

initPage()