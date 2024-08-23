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

let me, users, drinks
let colourMap = {}
let socket

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

            me = new User(myUsername, myWeight, mySex, myRoom)
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
}

function initPage() {
    const wsUrl = `ws://${document.domain}:5001/ws`
    socket = new WebSocket(wsUrl);
    socket.onopen = function() {
        console.log("Websocket opened");
        socket.send("init")
        socket.addEventListener("message", function(e) {
            const jsonData = JSON.parse(e.data);
            console.warn(jsonData)
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
    })
}

initPage()