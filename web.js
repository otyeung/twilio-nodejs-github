// Import required modules
const http = require('http')
const express = require('express')
const twilio = require('twilio')
const bodyParser = require('body-parser')

// Create Express app
const app = express()

// Parse request bodies for POST requests
app.use(bodyParser.urlencoded({ extended: false }))

// Twilio credentials stored as environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

// Add a simple HTTP route to return 'hello'
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Create Twilio REST client
const client = twilio(accountSid, authToken)

// HTTP POST Request Handler for Twilio REST
// Endpoint for making calls, /call
// Parameters required :
// lastName - last name of the customer
// firstName - first name of the customer
// companyName - company name of the customer
// customerPhone - phone number of the customer
// salesRepPhone - phone number of the sales rep
// callerId - verified caller ID in Twilio account(Phone Numbers->Manage->Verified Caller IDs), caller ID to be displayed on customer's phone
// Call Flow :
// 1. Twilio calls Sales Rep phone
// 2. Sales Rep pick up the phone, and hear personalized message with the name of the customer and company name
// 3. Twilio transfer the call to customer phone, and display the verified caller ID on customer phone
// 4. Customer picks up the call, and talks to the sales rep
app.post('/call', (req, res) => {
  // The phone numbers to connect
  const lastName = req.body.lastName
  const firstName = req.body.firstName
  const fromNumber = req.body.callerId // must be verified caller ID, to be displayed on customer's phone
  const toNumber = req.body.salesRepPhone
  const customerNumber = req.body.customerPhone
  const companyName = req.body.companyName

  console.log(`Calling ${toNumber} and transferring to ${customerNumber}`)

  // Use the Twilio API to create a new phone call
  client.calls
    .create({
      to: toNumber,
      from: fromNumber,
      twiml: `
      <Response>
        <Say>Hello, I'm connecting you to new customer ${firstName} ${lastName} from ${companyName}, please hold the line</Say>
        <Dial action="/transfer" method="POST">
          <Number>${customerNumber}</Number>
        </Dial>
      </Response>
    `,
    })
    .then((call) => {
      console.log(`Started call ${call.sid}`)
      res.status(200).send(`Started call ${call.sid}`)
    })
    .catch((error) => {
      console.error(`Error starting call: ${error}`)
      res.status(500).send(`Error starting call: ${error}`)
    })
})

// HTTP POST Request Handler for Twilio REST
// Endpoint for making calls, /call2
// Parameters required :
// companyName - company name of the sales rep (advertiser)
// customerPhone - phone number of the customer
// salesRepPhone - phone number of the sales rep
// callerId - verified caller ID in Twilio account(Phone Numbers->Manage->Verified Caller IDs), caller ID to be displayed on customer's phone
// Call Flow 2 :
// 1. Twilio calls Customer phone
// 2. Customer pick up the phone, and hear personalized message about the context of the call
// 3. Twilio transfer the call to sales rep phone, and display the verified caller ID on sales rep phone
// 4. Sales rep picks up the call, and talks to the customer
app.post('/call2', (req, res) => {
  // The phone numbers to connect
  //const lastName = req.body.lastName
  //const firstName = req.body.firstName
  const fromNumber = req.body.callerId // must be verified caller ID, to be displayed on customer's phone
  const toNumber = req.body.salesRepPhone
  const customerNumber = req.body.customerPhone
  const companyName = req.body.companyName

  console.log(`Calling ${toNumber} and transferring to ${customerNumber}`)

  // Use the Twilio API to create a new phone call
  client.calls
    .create({
      to: customerNumber,
      from: fromNumber,
      twiml: `
      <Response>
        <Say>Hello, I'm transferring you to the sales rep from ${companyName}, please hold the line</Say>
        <Dial action="/transfer" method="POST">
          <Number>${toNumber}</Number>
        </Dial>
      </Response>
    `,
    })
    .then((call) => {
      console.log(`Started call ${call.sid}`)
      res.status(200).send(`Started call ${call.sid}`)
    })
    .catch((error) => {
      console.error(`Error starting call: ${error}`)
      res.status(500).send(`Error starting call: ${error}`)
    })
})

// Send SMS message to customer
// Parameters required:
// phone - customer's phone number
// callerId - use your purchased Twilio number, go to Twilio console -> Phone Numbers -> Manage -> Active numbers
app.post('/message', (req, res) => {
  const messageBody = `Hello! Thank you for your interest. Our sales rep will contact with you shortly! `

  client.messages
    .create({
      to: req.body.phone,
      from: req.body.callerId, // Your verified caller ID from Twilio
      body: messageBody,
    })
    .then((message) => {
      console.log(`Sent message ${message.sid}`)
      res.status(200).send(`Sent message ${message.sid}`)
    })
    .catch((error) => {
      console.error(`Error sending message: ${error}`)
      res.status(500).send(`Error sending message: ${error}`)
    })
})

// Send whatsapp message to customer
// Parameters required:
// message - the message to be sent
// phone - customer's phone number
// callerId - use your purchased Twilio number, go to Twilio console -> Phone Numbers -> Manage -> Active numbers
app.post('/send-whatsapp', (req, res) => {
  const fromNumber = req.body.callerId // must be verified caller ID, to be displayed on customer's phone
  const toNumber = req.body.phone
  const message = req.body.message

  client.messages
    .create({
      body: message,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${toNumber}`,
    })
    .then((message) => {
      console.log(`Message sent to ${toNumber}. SID: ${message.sid}`)
      res.status(200).json({ success: true })
    })
    .catch((error) => {
      console.error('Error sending WhatsApp message:', error)
      res.status(500).json({ success: false, error: error.message })
    })
})

// Create an HTTP server to listen for incoming requests
const server = http.createServer(app)
const port = process.env.PORT || 3000

server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
