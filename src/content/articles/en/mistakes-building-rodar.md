---
title: The mistakes I made building Rodar
slug: mistakes-building-rodar
locale: en
translationKey: mistakes-building-rodar
excerpt: What I learned during my first year building Rodar and how those mistakes changed the product.
publishedAt: 2026-08-26T12:00:00-04:00
seoTitle: The mistakes I made building Rodar
seoDescription: Lessons from Rodar's first year, from crowdfunding and financing to building technology that helps dealerships understand cars better.
---

A year and two months ago, I founded Rodar, a startup focused on the automotive industry where I've made quite a few mistakes. I've learned from several of them, and I'd like to share some of the lessons I've collected along the way.

We now want to apply to YC, a16z, and others—and hopefully get in. We also want to bring more customers onto Rodar, generate more data, and improve the parts of the product we need today.

## Research before you launch

For those who remember Rodar in its early days, the first version was a crowdfunding platform for used cars. It was similar to what the team at [Fraccional.cl](https://fraccional.cl/) does with real estate, where you can take part in an investment without having to buy an entire property.

I had followed them almost like a fanboy for years, ever since they launched, and when I thought about doing something similar with cars, it felt like the idea of the century.

![At the Fraccional offices](/articles/errores-construyendo-rodar/fraccional-offices.png)

_At the Fraccional offices._

In theory, it made sense.

Cars depreciate, but there is a huge market for buying and selling used vehicles. People and companies have spent decades making money by buying a car, fixing it up or waiting for the right opportunity, and selling it for more.

The famous practice of car _flipping_.

Our problem was how we wanted to finance those deals: crowdfunding.

Chile's Fintech Act—or FINTEC, as it is written in the Library of Congress—was enacted in late 2022 and published in January 2023. It regulated exactly one of the activities we wanted to enter.

> Article 5.—Regulated services and registration requirement. Only those registered in the Financial Service Providers Registry administered by the Commission may professionally provide crowdfunding platform, alternative transaction system, financial instrument intermediation, order routing, credit advisory, investment advisory, and financial instrument custody services.

We read this and spoke with several lawyers.

The estimates we received for preparing the regulatory process and obtaining authorization were around ten months. And even after those ten months, nobody could guarantee that Chile's Financial Market Commission would approve us.

We were going to spend almost a year before we could validate whether anyone wanted our product.

### Why could Fraccional do it?

We got this question a lot:

“Hey, if Fraccional could do it, so can you.”

[…]

Fraccional was already operating before this new framework began to apply.

The law included a transitional regime for companies already providing these services. They could continue operating while beginning the registration and authorization process with the Financial Market Commission.

We were coming in afterward.

We had to pivot Rodar because continuing down that path meant spending months working through regulation before knowing whether anyone wanted what we were building.

The other option was to give up on it.

![A supportive message during Rodar's early stage](/articles/errores-construyendo-rodar/early-stage-message.png)

Sometimes messages like this help when you're making those kinds of decisions.

## Jack of all trades, master of none

Something like that was the saying, and it turned out to be very true.

When we spoke with dealerships, we found a problem and interpreted it through a heavily biased lens:

Dealerships need liquidity.

_(No, not all of them.)_

So we thought about becoming a kind of bank for dealerships. We would lend them money, using the value of their inventory as one of the variables for deciding how much to finance.

We had already built tools for valuing cars and managing inventory, so we spoke with one of our investors and started thinking about raising capital.

Because before you can lend money, you need to have money.

He asked us one question:

Why should you be the ones doing this?

We gave very bad answers.

We had no advantage that justified turning Rodar into a lending company.

I had read quite a bit about Brex and ended up drawing a biased conclusion from a case that had little to do with us.

I thought that to win over dealerships, get their data, and eventually offer them financing, we had to build all the software they used.

A DMS (_Dealer Management System_), intelligence tools, and financing—all inside the same product.

That multiplied the amount of development work ahead of us.

Suddenly we had to solve inventory, sales, administration, analytics, credit, and an absurd number of dealership edge cases.

It reached a point where neither Felipe nor I wanted to open the project.

We continued serving customers and even tested financing with some of them, with amounts close to US$5,000 per customer each month. It worked and generated revenue, but every week something else appeared that we had to build.

We didn't know where Rodar ended.

## Don't just dip into the industry—DIVE ALL THE WAY IN

I'm lucky that my dad is a mechanic.

One day he brought me a CD containing an ancient piece of automotive repair software. As he showed me the program, he started telling me about the scanners they connected to cars to diagnose problems.

I spent several afternoons learning how a car worked, and I was intrigued whenever he talked about “the computer.”

Cars have computers?

Yes.

Hmm.

If they have a computer, they store information.

I started researching how to read it.

That's when OBD, ECUs, CAN bus, diagnostic trouble codes, sensors, and modules appeared. At first, I thought connecting a scanner meant you could ask the car anything. Then I learned that it doesn't work that way.

OBD gives you part of the picture. Some manufacturers expose more information than others. Reading certain modules requires knowledge of manufacturer-specific protocols, and modern cars may also have gateways that control access.

I liked that problem much more than anything else we had tried.

It also had something we had never done well with Rodar: it forced me to immerse myself in the industry.

Talk to my dad.

Connect cars.

Read documentation.

Understand why a mechanic checks one thing before another.

Ask a dealership what they look at when a vehicle comes in.

We started looking at Rodar from that perspective.

## What is Rodar today?

Today, we're building Rodar so a dealership can know more about a car before buying it and while it remains in inventory.

Part of that information comes from the vehicle itself.

We connect hardware to the car and read whatever information we can obtain from its systems: diagnostic trouble codes, available ECU parameters, and other data that depends on the make, model, and protocol.

Then we cross-reference it with external information.

For example, the vehicle's history, publicly available information, and the prices of similar cars on the market.

The dealership also generates data we're interested in. We know when it bought a car, how much it paid, the price at which it tried to sell it, and how long the listing has been up.

With these sources, we want to answer questions a dealership has to deal with every day.

I'm looking at a car to buy. How much should I pay?

I connected it and found certain errors. What do they mean for this purchase?

I have ten units of the same model. At what price are similar ones moving?

A car has been sitting in inventory for too long. Is its price out of line with the market?

We also want to detect inconsistencies across sources. If the car reports one thing and its history shows another, Rodar can flag it for someone to review before closing the purchase.

That's what we're building now.

We're still learning how much we can read from each car. We also haven't solved deep access across every manufacturer, and we'll probably spend a long time working on that.

But now I can sit in front of a car, connect a device to it, and learn something I didn't know yesterday.

I can also visit a dealership and ask what would have changed about its decision if it had known that piece of information before buying the car.

It's a very different way of working from how I started Rodar.

During the crowdfunding phase, I spent a lot of time thinking about how the business should work before we had users.

We did something similar with financing. We found a problem, assumed it was the entire industry's problem, and started building around that idea.

Now I'd rather connect another car.

There are hundreds of models, manufacturers, protocols, and purchasing decisions I still don't understand. That will keep me busy for a long time.

If you work at a dealership or repair shop—or simply know a lot about cars—and you're interested in what we're building, send me a message. Talking to people who are genuinely immersed in the industry helps me a lot.
