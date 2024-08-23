package main

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"sync"
)

var clientMutex sync.Mutex
var clients = make(map[*websocket.Conn]bool)

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
			// verify browser
			// apply changes
		}
	}
}

func SendInitialBAP(conn *websocket.Conn) {
	// send the initial BAP
}
