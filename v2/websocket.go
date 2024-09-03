package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

var clientMutex sync.Mutex
var cmdsMutex sync.Mutex
var broadcast = make(chan Message)
var cmdsToSend []map[string]any
var clients = make(map[*websocket.Conn]bool)

func bacTicker() {
	ticker := time.NewTicker(10 * time.Second)
	for {
		select {
		case <-ticker.C:
			users := GetAllUsers()
			var userBacMap = make(map[string]float64)
			for _, user := range users {
				newBac := CalculateBACChange(user.BAC, float64(user.Weight), user.Sex)
				err := UpdateBAC(user.Name, newBac)
				if err != nil {
					continue
				}
				userBacMap[user.Name] = newBac
			}
			var tempInstruction = make(map[string]any)
			tempInstruction["cmd"] = "updateBAC"
			tempInstruction["data"] = userBacMap
			cmdsMutex.Lock()
			cmdsToSend = append(cmdsToSend, tempInstruction)
			cmdsMutex.Unlock()
		}
	}
}

func SendMessage() {
	wsSendDelay, _ := strconv.Atoi(os.Getenv("WS_SEND_DELAY"))
	ticker := time.NewTicker(time.Duration(wsSendDelay) * time.Millisecond)
	for {
		select {
		case <-ticker.C:
			//log.Printf("Locking mutex\n")
			cmdsMutex.Lock()
			if len(cmdsToSend) > 0 {
				clientMutex.Lock()
				jsonVer, _ := json.Marshal(cmdsToSend)
				broadcast <- Message{Msg: jsonVer, Conn: nil}
				cmdsToSend = cmdsToSend[:0]
				//TODO look at wsMutex
				clientMutex.Unlock()
			}
			cmdsMutex.Unlock()
		}
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		clientMutex.Lock()
		for client := range clients {
			if msg.Conn == nil || client == msg.Conn {
				err := client.WriteMessage(websocket.TextMessage, msg.Msg)
				if err != nil {
					log.Printf("Error writing message: %v\n", err)
					err := client.Close()
					if err != nil {
						return
					}
					delete(clients, client)
				}
			}
		}
		clientMutex.Unlock()
	}
}

type Message struct {
	Msg  []byte
	Conn *websocket.Conn
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func Handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error in upgrader - %v\n", err)
		return
	}
	defer func(conn *websocket.Conn) {
		err := conn.Close()
		if err != nil {
			fmt.Printf("Error closing connection - %v\n", err)
		}
	}(conn)

	clientMutex.Lock()
	clients[conn] = true
	clientMutex.Unlock()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read:", err)
			clientMutex.Lock()
			delete(clients, conn)
			clientMutex.Unlock()
			break
		}
		log.Printf("recv: %s", msg)
		if string(msg) == "init" {
			go SendInitialBAP(conn)
		} else {
			jsonString := string(msg)
			var jsonMap map[string]interface{}
			err := json.Unmarshal([]byte(jsonString), &jsonMap)
			if err != nil {
				log.Printf("Error in json unmarshal - %v\n", err)
			}
			log.Println(jsonMap)
			// TODO check if the user already exists
			cmd := jsonMap["cmd"]
			data := jsonMap["data"].(map[string]any)
			switch cmd {
			case "new user":
				weightInt := int(math.Round(data["weight"].(float64)))
				err := AddUser(data["name"].(string), weightInt, data["sex"].(string), data["room"].(string), float64(0))
				if err != nil {
					log.Printf("Error in add user - %v\n", err)
				}
			case "new drink":
				volumeFloat := data["volume"].(float64)
				strengthFloat := data["strength"].(float64)
				name := data["name"].(string)
				weight := data["weight"].(float64)
				sex := data["sex"].(string)
				bac := data["bac"].(float64)
				newBac := GlugGlug(bac, sex, weight, volumeFloat, strengthFloat)
				err := UpdateBAC(name, newBac)
				if err != nil {
					return
				}
			}
			// verify browser
			// apply changes
		}
	}
}

func SendInitialBAP(conn *websocket.Conn) {
	users := GetAllUsers()
	var userBacMap = make(map[string]float64)
	for _, user := range users {
		newBac := CalculateBACChange(user.BAC, float64(user.Weight), user.Sex)
		err := UpdateBAC(user.Name, newBac)
		if err != nil {
			continue
		}
		userBacMap[user.Name] = newBac
	}
	var tempInstruction = make(map[string]any)
	tempInstruction["cmd"] = "updateBAC"
	tempInstruction["data"] = userBacMap

	clientMutex.Lock()
	jsonVer, _ := json.Marshal(tempInstruction)
	broadcast <- Message{Msg: jsonVer, Conn: conn}
	//TODO look at wsMutex
	clientMutex.Unlock()
}
