// console.log(process.pid)
const express = require('express');
const socketIO = require('socket.io');
const os = require('os');
const http = require('http');
const port = 5000
var app = express();
var bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
let server = http.createServer(app);
var io = socketIO(server);

// middlewares
app.use(express.static('public'))
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

// initials
let dataObject = {'12345':{'sockets': [], 'text': 'Text for Room 12345'}, }
let text = ''
const getAllCodes = () =>{
    let arr = Object.keys(dataObject)
    return arr
}
const broadcastText = (sender, sockets, text) =>{
    sockets.forEach((socket)=>{
        if (socket.id !== sender){
            console.log('Sent message to ', socket.id)
            socket.emit('serverText', {
                from: 'server',
                text: text
            })
        }
    })
}

app.get("/", (req, res) => {
    console.log('/ using server')
    res.sendFile(__dirname + "/public/index.html");
})

// post method joins/creates a new code room 
app.post("/", (req, res) => {
    let code = req.body.code
    console.log(code)
    if (code === '12345') {
        res.statusMessage = 'Code valid'
        res.statusCode = 200
        res.cookie('code', code)
        // res.send({'code': `valid`})
        res.send({ 'code': code })
    }
    else {
        res.statusMessage = 'Code does not exists'
        res.statusCode = 202
        res.setHeader('Content-Type', 'application/json;charset=utf-8')
        res.send({ 'message': `'${code}' does not exists...Try again or Create a new one instead` })
    }
})

io.on('reconnection', (socket)=>{
    console.log('Reconnected')
})

// Clipboard route
app.get("/clipboard", (req, res) => {
    console.log('/clipboard using server')
    res.sendFile(__dirname + "/public/clipboard.html");

    // make and hear connection with client from server side
    io.on('connection', (socket) => {
        console.log('New user connected : ', socket.id);
        console.log('Cookies :', req.cookies)
        // console.log(Object.keys(socket))
        // Object.keys(socket).forEach((key)=>{
        //     console.log(key, socket[key])
        // })
        if (req.cookies['code']) {
            let code = req.cookies['code']
            
            // joins current socket to the room that is named as the code
            dataObject[code]['sockets'].push(socket)
            socket.join(code)
            console.log('Current rooms :', socket.rooms)

            // sends message to recently new connected socket from its room text
            setTimeout(() => {
                socket.emit('serverMessage', {
                    from: 'server',
                    text: text || dataObject[code]['text'],
                })
            }, 1000)
        }
        socket.on('reconnection', (socket)=>{console.log("reconnected")})

        // listen message from client
        socket.on('clientMessage', (message) => {
            console.log('clientMessage', message);
            text = message.text
            let id = socket.id
            let code = req.cookies['code']
            console.log('Message from ', id)

            // check room code and broadcast text to the room with the code
            if (code === '12345') {
                // console.log('Broadcast to ', dataObject[code]['sockets'])
                setTimeout(() => {
                    io.sockets.in(code).except(id).emit('serverMessage', {
                        from: id,
                        text: text,
                    })
                    // broadcastText(id, dataObject[code]['sockets'], text)
                }, 1000)
            }
        });

        // when server disconnects from user
        socket.on('disconnect', () => {
            console.log('disconnected from user');
        });
    });
});

server.listen(port, () => {
    console.log(port)
    let network = os.networkInterfaces()
    if (network['Wi-Fi']) {
        network['Wi-Fi'].forEach((type) => {
            // console.log(type)
            if (type.family === 'IPv4') {
                console.log('You have connected to wifi so you can use this link for other devices on the same network >>>', type.address + ':5000')
            }
        })
    }
});
