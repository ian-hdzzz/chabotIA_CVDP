import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

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

adapterProvider.server.get('/', (req, res) => {
    // Redirige a la ruta /qr
    res.redirect('/qr');
});

const busquedaEmpleo = addKeyword('empleo').addAnswer(
    ['Perfecto! Cuentame un poco más de ti, ¿De qué carrera eres egresado?'])
    .addAnswer()

const aiFlow = addKeyword('IA').addAnswer(
    '¿Qué quieres preguntar? (escribe tu consulta):',
    { capture: true },
    async (ctx, { flowDynamic }) => {
        
        await flowDynamic('Procesando tu solicitud, por favor espera unos segundos...');

        const userMessage = ctx.body; // Mensaje del usuario
        const aiResponse = await callOpenAI(userMessage); // Llama a OpenAI
        await flowDynamic(aiResponse); // Responde con la respuesta de OpenAI
    }
);
const welcomeFlow = addKeyword(['hi', 'hello', 'hola'])
    .addAnswer('¡Hola, bienvenido! Soy el asistente de Inteligencia Artificial del CVDP Campus Querétaro y estoy aqui para ayudarte 😉 ')
    .addAnswer(
        [
            '¿En qué puedo ayudarte el día de hoy?',
            '\n1. Búsqueda de empleo escribe 👉 *empleo*',
            '2. Prácticas profesionales escribe 👉 *prácticas*',
            '3. Preparación para entrevista escribe 👉 *entrevista*',
            '4. Revisión de CV escribe 👉 *CV*',
            '5. Hablar con un asesor escribe 👉 *asesor*',
            '6. Utilizar asistente IA escribe 👉 *IA*',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (!ctx.body.toLocaleLowerCase().includes('ia' || 'empleo' || 'prácticas' || 'practicas' || 'entrevista' || 'CV' ||'asesor' || 'IA')) {
                return fallBack('Elije una de las opciones mencionadas anteriormente ')
            }
            return
        },
        [aiFlow]
    )

      
const registerFlow = addKeyword(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`What is your name?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    })
    .addAnswer('What is your age?', { capture: true }, async (ctx, { state }) => {
        await state.update({ age: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        await flowDynamic(`${state.get('name')}, thanks for your information!: Your age: ${state.get('age')}`)
    })

const fullSamplesFlow = addKeyword(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, registerFlow, fullSamplesFlow,aiFlow   ])
    
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

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
