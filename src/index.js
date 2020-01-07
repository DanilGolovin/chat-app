const express = require('express')
const path = require('path')
const http = require('http')
const soketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = soketio(server)

const port = process.env.PORT || 3000
const pubDirPath = path.join(__dirname, '../public')

app.use(express.static(pubDirPath))


io.on('connection', (socket) => {
    console.log('New websocket connection')
//чтобы отправить событие, мы используем на сервере socket.io

    socket.on('join', (options, callback) => {
        const {error, user} = addUser({id : socket.id, ...options}) //  Значение для этого на самом деле приходит на самом объекте сокета. Это идентификатор точки сокета, который является уникальным идентификатором для данного конкретного соединения.
        //Мы посмотрим, есть ли ошибка, и если она будет, мы отправим ее обратно клиенту.
        if (error) { //отслеживает пользователя
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMessage( 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined`))//...to... позволит нам отправить сообщение всем в комнате, не отправляя его людям в  другие комнаты
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left`))
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})


server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})