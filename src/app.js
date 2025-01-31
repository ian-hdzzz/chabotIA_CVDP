import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// Conexión con OPEN AI
const openaiApiKey = process.env.OPENAI_API_KEY;
const callOpenAI = async (userMessage) => {
    const data = JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage },
        ],
    });

    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
        },
        data: data,
    };

    try {
        const response = await axios(config);
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error with OpenAI API:", error.message);
        return "Lo siento, hubo un problema al procesar tu solicitud.";
    }
};

const PORT = process.env.PORT ?? 3000


let respuestasEmpleo = []
let currentFlow = null; 

const empleo = addKeyword('empleo').
    addAnswer('Perfecto! Cuentame un poco más de ti, ¿De qué carrera eres egresado?',
    {delay:800, capture:true},
    async (ctx, {fallBack, flowDynamic})=> {
        currentFlow = 'empleo'; 
        respuestasEmpleo.push(ctx.body); // Guarda la primera respuesta
        await flowDynamic('Genial, ahora cuéntame, ¿En qué industira en específico te gustaría aplicar tu conocimientos de dicha carrera?');
    })
    .addAnswer(
        null, // No repite el mensaje anterior
        { delay: 800, capture: true },
        async (ctx, { flowDynamic }) => {
            if (currentFlow !== 'empleo') return; 
            respuestasEmpleo.push(ctx.body); // Guarda la segunda respuesta
            await flowDynamic('Interesante, ¿En que ciudad/estado/país te gustaría obtener ese trabajo?');
        }
    )
    .addAnswer(
        null,
        { delay: 800, capture: true },
        async (ctx, { flowDynamic }) => {
            if (currentFlow !== 'empleo') return; 
            respuestasEmpleo.push(ctx.body); // Guarda la quinta respuesta
    
            // Crea una oración con las respuestas recolectadas
            const mensajeFinal = `¡Increible! Ahora puedes copiar el siguiente promt en nuestra herramienta de IA seleccionando la opción o en su defecto utilizar alguna de tu preferencia.
            \n- Utilizando LINKEDIN,  genera una lista de 5 empresas en ${respuestasEmpleo[2]} que ofrezcan la vacante ${respuestasEmpleo[0]}  en el sector ${respuestasEmpleo[1]}.`
                
            // Envía la respuesta final
            await flowDynamic(mensajeFinal);
        
            // Limpia el array para futuras conversaciones
            respuestasEmpleo = [];
        }
    );

const practicas = addKeyword('practicas').addAnswer(
    ['Perfecto! Cuentame un poco más de ti, ¿Que carrera estás estudiando?'])
    .addAnswer()

const entrevista = addKeyword('entrevista').addAnswer(
    ['Perfecto! Te presento a nuestro equipo de trabajo con quien podras agendar una cita para tu simulación de entrevista'])
    .addAnswer('Stephano Loza',{
        media: './public/img/stephano.png'
    })
    .addAnswer(['Coordinador de empleabilidad','Asesoría, atención a alumnos para empleo y atención a empresas'])
    
    .addAnswer('Clemente Garcia',{
        media: './public/img/clemente.png'
    })
    .addAnswer(['Coordinador de Desarrollo de Talento','Asesoría, atención a alumnos para empleo y atención a empresas'])

    .addAnswer('Lisbeth Sevilla',{
        media: './public/img/lis.png'
    })
    .addAnswer(['Coordinadora de Experiencia Profesional','Asesoría, atención a alumnos para prácticas voluntarias y estancias profesionales'])
    .addAnswer('¿Con quién de nuestros especialistas te gustaría tomar tu simulación de entrevista, Stephano, Clemente o Lisbeth?')

const cv = addKeyword('cv').addAnswer(
    ['Perfecto! Cuentame en que parte del proceso estas...'])
    .addAnswer('¿Empezando, intermedio o solo requieres una revisión?')

const asesor = addKeyword('asesor').addAnswer(
    ['Tus deseos son ordenes, ¿hay alguien en especifico a quien te gustaría contactar?'])
    .addAnswer()

const aiFlow = addKeyword('IA').addAnswer(
    'Ahora estas utilizando la herramienta de IA del CVDP \n ¿Qué deseas preguntar? (escribe tu consulta):',
    { capture: true },
    async (ctx, { flowDynamic }) => {
        
        await flowDynamic('Procesando tu solicitud, por favor espera unos segundos...');

        const userMessage = ctx.body; // Mensaje del usuario
        const aiResponse = await callOpenAI(userMessage); // Llama a OpenAI
        await flowDynamic(aiResponse); // Responde con la respuesta de OpenAI
    }
);



const welcomeFlow = addKeyword(['hi', 'hello', 'hola', 'opciones'])
    .addAnswer('¡Hola, bienvenido! Soy el asistente de IA del CVDP Campus Querétaro y estoy aqui para ayudarte 😉 ')
    .addAnswer(
        [
            '¿En qué puedo ayudarte el día de hoy?',
            '\n1. Búsqueda de empleo escribe 👉 *empleo*',
            '2. Prácticas profesionales escribe 👉 *prácticas*',
            '3. Preparación para entrevista escribe 👉 *entrevista*',
            '4. Revisión de CV escribe 👉 *CV*',
            '5. Hablar con un asesor escribe 👉 *asesor*',
            '6.Utilizar asistente IA escribe 👉 *IA*',
            '\nSi ya estas en una sección y te gustaría explorar alguna otra, solo escribe *opciones* para volver a mostrarte el menu'
        ],
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (ctx.body.includes('ia')) {
                return
            }else if (ctx.body.includes('empleo')){
                return
            }else if (ctx.body.includes('practicas')){
                return
            }else if (ctx.body.includes('entrevista')){
                return
            }else if (ctx.body.includes('cv')){
                return
            }else if (ctx.body.includes('asesor')){
                return
            }else{
                fallBack('Elije una de las opciones mencionadas anteriormente ')
            }
        },
        [empleo, practicas, entrevista, cv, asesor, aiFlow],
    )
  

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow])
    
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.get('/', (req, res) => {
        
        const qrImagePath =  'bot.qr.png';

        // Enviar la imagen como respuesta
        res.sendFile(qrImagePath, (err) => {
            if (err) {
                console.log('Error al enviar la imagen:', err);
                return res.status(500).send('Error al procesar la imagen');
            }
        });
       
    });

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )
   
    httpServer(+PORT)
}

main()