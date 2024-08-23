export class User {
    constructor(name, weight, sex, room) {
        this.name = name;
        this.weight = weight;
        this.sex = sex;
        this.room = room;
    }

    getName() {
        return this.name;
    }
    setName(name) {
        this.name = name;
    }

    getWeight() {
        return this.weight;
    }
    setWeight(weight) {
        this.weight = weight;
    }

    getSex() {
        return this.sex
    }
    setSex(sex) {
        this.sex = sex
    }

    getRoom() {
        return this.room;
    }
    setRoom(room) {
        this.room = room;
    }
}