---
title: Los errores que cometí construyendo Rodar
slug: errores-construyendo-rodar
locale: es
translationKey: mistakes-building-rodar
excerpt: Lo que he aprendido durante el primer año construyendo Rodar y cómo esos errores cambiaron el producto.
publishedAt: 2026-08-26T12:00:00-04:00
seoTitle: Los errores que cometí construyendo Rodar
seoDescription: Las lecciones del primer año de Rodar, desde el crowdfunding y el financiamiento hasta construir tecnología para entender mejor los autos.
---

Hace un año y dos meses fundé Rodar, una startup enfocada en el mundo automotriz en la que he cometido bastantes errores. He aprendido de varios de ellos y me gustaría compartir algunos de los que he ido recolectando durante este tiempo.

Ahora queremos postular a YC, a16z, etc. y ojalá quedar. También queremos conseguir más clientes que usen Rodar, generar más datos y mejorar las partes del producto que hoy necesitamos.

## Investigar antes de lanzar

La primera versión, para aquellos que recuerdan Rodar en sus inicios, era un crowdfunding de autos usados. Algo parecido a lo que hacen los chicos de [Fraccional.cl](https://fraccional.cl/) con propiedades, donde puedes participar en una inversión sin tener que comprar una propiedad completa.

Llevaba años siguiéndolos casi a modo de fanboy, desde que salieron, y cuando pensé en hacer algo parecido pero con autos sentí que era la idea del siglo.

![Foto en las oficinas de Fraccional](/articles/errores-construyendo-rodar/fraccional-offices.png)

_Foto en las oficinas de Fraccional._

En teoría tenía sentido.

Los autos se deprecian, pero existe un mercado enorme de compraventa de usados. Hay gente y empresas que llevan décadas ganando dinero comprando un auto, arreglándolo o esperando una oportunidad y vendiéndolo más caro.

El famoso _flipping_ de autos.

Nuestro problema estaba en cómo queríamos financiar esas operaciones: crowdfunding.

La Ley Fintec, o FINTEC como aparece escrita en la BCN, fue promulgada a fines de 2022 y publicada en enero de 2023. Dentro de ella se regulaba justo una de las actividades en las que nosotros queríamos entrar.

> Artículo 5.- Servicios regulados y obligación de inscripción. Sólo podrán dedicarse en forma profesional a la prestación de servicios de plataforma de financiamiento colectivo, sistema alternativo de transacción, intermediación de instrumentos financieros, enrutamiento de órdenes, asesoría crediticia, asesoría de inversión y custodia de instrumentos financieros, quienes estén inscritos en el Registro de Prestadores de Servicios Financieros administrado por la Comisión.

Leímos esto y hablamos con distintos abogados.

Las estimaciones que recibíamos para preparar el proceso regulatorio y conseguir las autorizaciones rondaban los diez meses. Y después de esos diez meses nadie podía garantizarnos que la CMF nos autorizara.

Íbamos a pasar casi un año antes de poder validar si alguien quería nuestro producto.

### ¿Por qué Fraccional sí pudo?

Nos hacían mucho esta pregunta:

“Oye, pero si Fraccional pudo, ustedes también”.

[…]

Fraccional ya operaba antes de que empezara a aplicarse este nuevo marco.

La ley contempló un régimen transitorio para las empresas que ya prestaban estos servicios. Podían continuar operando mientras comenzaban su proceso de inscripción y autorización ante la CMF.

Nosotros estábamos entrando después.

Tuvimos que pivotear Rodar porque seguir por ese camino significaba pasar meses trabajando en regulación antes de saber si alguien quería lo que estábamos construyendo.

La otra opción era abandonarlo.

![Mensaje de apoyo durante una etapa temprana de Rodar](/articles/errores-construyendo-rodar/early-stage-message.png)

A veces estos mensajes sirven cuando estás tomando ese tipo de decisiones.

## El que mucho abarca, poco aprieta

Algo así era la frase y vaya que era cierta.

Cuando hablamos con automotoras encontramos un problema y lo interpretamos de forma bastante sesgada:

Las automotoras necesitan liquidez.

_(No, no todas)._

Pensamos entonces en volvernos una especie de banco para automotoras. Les prestaríamos dinero usando el valor de su flota como una de las variables para decidir cuánto financiar.

Ya habíamos construido herramientas para valorizar autos y administrar inventario, así que hablamos con uno de nuestros inversionistas y empezamos a pensar en levantar capital.

Porque para prestar plata primero necesitas tener plata.

Él nos hizo una pregunta:

¿Por qué tendrían que hacer esto ustedes?

Dimos respuestas muy malas.

No teníamos ninguna ventaja que justificara convertir Rodar en una empresa de crédito.

Yo había leído bastante sobre Brex y terminé sacando una conclusión sesgada desde un caso que tenía poco que ver con nosotros.

Pensé que para captar automotoras, conseguir sus datos y después ofrecerles financiamiento debíamos construir todo el software que utilizaban.

Un DMS (_Dealer Management System_), herramientas de inteligencia y financiamiento dentro del mismo producto.

Eso multiplicó el desarrollo que teníamos por delante.

De pronto teníamos que resolver inventario, ventas, administración, analítica, crédito y una cantidad absurda de casos borde de una automotora.

Llegó un punto en que ni Felipe ni yo queríamos abrir el proyecto.

Seguíamos atendiendo clientes y llegamos a probar financiamiento con algunos de ellos, con montos cercanos a US$5.000 mensuales por cliente. Funcionaba y generaba ingresos, pero cada semana aparecía otra cosa que debíamos construir.

No sabíamos dónde terminaba Rodar.

## No te sumerjas un poco en la industria, LÁNZATE Y BUCEA

Tengo la suerte de que mi papá es mecánico.

Un día me trajo un CD de un software de mecánica antiquísimo. Mientras me mostraba el programa empezó a hablarme de los escáneres que conectaban a los autos para diagnosticar fallas.

Pasé varias tardes aprendiendo cómo funcionaba un auto y me llamaba la atención cuando hablaba de “la computadora”.

¿Los autos tienen computadora?

Sí.

Uhm.

Si tienen una computadora, guardan información.

Empecé a investigar cómo leerla.

Ahí aparecieron OBD, ECU, CAN Bus, códigos de diagnóstico, sensores y módulos. Al principio pensaba que conectar un escáner significaba poder preguntarle cualquier cosa al auto. Después descubrí que no funciona así.

OBD te entrega una parte. Algunos fabricantes exponen más información que otros. Para leer ciertos módulos necesitas conocer protocolos específicos del fabricante y en autos modernos también puedes encontrarte con gateways que controlan el acceso.

Me gustó mucho más ese problema que todo lo que habíamos intentado antes.

Además tenía algo que nunca habíamos hecho bien con Rodar: me obligaba a meterme en la industria.

Hablar con mi papá.

Conectar autos.

Leer documentación.

Entender por qué un mecánico revisa una cosa antes que otra.

Preguntarle a una automotora qué mira cuando recibe un vehículo.

Empezamos a mirar Rodar desde ahí.

## ¿Qué es Rodar hoy?

Hoy estamos construyendo Rodar para que una automotora pueda saber más de un auto antes de comprarlo y mientras lo tiene en stock.

Una parte viene del mismo vehículo.

Conectamos hardware al auto y leemos la información que podamos obtener de sus sistemas: códigos de diagnóstico, parámetros disponibles desde las ECU y otros datos que dependen de la marca, modelo y protocolo.

Después cruzamos eso con información externa.

Por ejemplo, historial del vehículo, información pública disponible y precios de otros autos similares en el mercado.

La automotora también genera datos que nos interesan. Sabemos cuándo compró un auto, cuánto pagó, a qué precio intentó venderlo y cuánto tiempo lleva publicado.

Con esas fuentes queremos responder preguntas que una automotora tiene que contestar todos los días.

Estoy mirando un auto para comprarlo. ¿Cuánto debería pagar?

Lo conecté y aparecen ciertos errores. ¿Qué significan para esta compra?

Tengo diez unidades de un mismo modelo. ¿A qué precio se están moviendo otras similares?

Un auto lleva demasiado tiempo en stock. ¿El precio está fuera de mercado?

También queremos detectar inconsistencias entre fuentes. Si el auto entrega una información y su historial muestra otra, Rodar puede marcarlo para que alguien lo revise antes de cerrar la compra.

Eso es lo que estamos construyendo ahora.

Todavía estamos aprendiendo cuánto podemos leer de cada auto. Tampoco tenemos resuelto el acceso profundo a todos los fabricantes y probablemente pasaremos bastante tiempo trabajando en eso.

Pero ahora puedo sentarme frente a un auto, conectarle un dispositivo y aprender algo que ayer no sabía.

También puedo ir donde una automotora y preguntar qué habría cambiado en su decisión si hubiese tenido ese dato antes de comprarlo.

Es una forma bastante distinta de trabajar a como empecé Rodar.

Durante el crowdfunding pasé mucho tiempo pensando en cómo debía funcionar el negocio antes de tener usuarios.

Con el financiamiento hicimos algo parecido. Encontramos un problema, asumimos que era el problema de toda la industria y empezamos a construir alrededor de esa idea.

Ahora prefiero conectar otro auto.

Hay cientos de modelos, fabricantes, protocolos y decisiones de compra que todavía no entiendo. Ahí tengo trabajo para rato.

Si trabajas en una automotora, taller o simplemente sabes mucho de autos y te interesa lo que estamos construyendo, escríbeme. Me sirve mucho hablar con gente que esté metida de verdad en la industria.
