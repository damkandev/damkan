"use client";
import dynamic from "next/dynamic";
import Title from "@/components/Title";
import Skills from "@/components/Skills";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import SmoothScroll from "@/utils/Lenis";
import NavBar from "@/components/NavBar";

export default function Home() {
  return (
    <SmoothScroll>
      <main className="">
        <NavBar />
        <section
          className="hero flex flex-col md:flex-row justify-between px-4 py-8 md:px-32 md:py-32"
          id="hero"
        >
          <div className="my-auto">
            <Title
              texto={"The only barrier is imagination."}
              accent={"imagination"}
            />
            <Skills
              skills={[
                "react",
                "next",
                "node",
                "supabase",
                "csharp",
                "python",
                "django",
                "openai",
                "figma",
              ]}
            />
            <Paragraph
              text={
                "My name is Damkan and I am passionate about programming amazing and fun ideas."
              }
            />
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                text={"See More"}
                href="https://damkan.lat"
                type="black"
                rounded={true}
              />
              <Button
                text={"Download CV"}
                href="/cv2024_en.pdf"
                type="white"
                rounded={true}
              />
            </div>
          </div>
          <img
            src="/faces/happy_face.svg"
            alt=""
            className="hidden md:inline-block h-[30vh] md:h-[60vh] rotate-6"
          />
        </section>
        <section className="px-4 py-8 md:px-32 md:py-32" id="work">
          <Title texto={"My Work."} accent={"work"} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
            <Card
              thumbnail="cryptodepto"
              skills={["Next", "Node", "MongoDB", "Figma"]}
              title={"Frontend Developer"}
              description={
                "I worked in Crypto Depto developing solutions and the interface based on the designs that came to us and continuously contributing in the development of new attractive and creative features."
              }
              href="https://argatio.com/"
              button={"See More"}
            />

            <Card
              thumbnail="mts"
              skills={["Next", "Python", "AWS", "Figma"]}
              title={"Product Manager"}
              description={
                "I worked in MTS as Product Manager leading and guiding the team, in addition to strengthening relationships with international corporations to achieve integrations in our platform."
              }
              href="https://mtsclub.org"
              button={"See More"}
            />

            <Card
              thumbnail="kerokero"
              skills={["Next", "Node", "Supabase", "Figma"]}
              title={"Founder"}
              description={
                "I am the founder of KeroKero, a digital agency that takes a fresh look at your brand and improves your online presence."
              }
              href="https://keroke.ro"
              button={"See More"}
            />
          </div>
        </section>
        <section className="px-4 py-8 md:px-32 md:py-32" id="projects">
          <Title texto={"My Projects."} accent={"projects"} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
            <Card
              thumbnail="froglabs"
              skills={["HTML", "CSS", "JavaScript", "Supabase"]}
              title={"FrogLabs"}
              description={
                "A programming class platform where I shared my knowledge in HTML, CSS and JavaScript."
              }
              href="https://froglabs.me"
              button={"See More"}
            />

            <Card
              thumbnail="ccg"
              skills={["React", "CSS"]}
              title={"CCG"}
              description={
                "A solution created with React to create the HTML cards that would then be uploaded to the FrogLabs website."
              }
              href="https://classcardgen.vercel.app/"
              button={"See More"}
            />

            <Card
              thumbnail="befast"
              skills={["FastAPI", "Python", "HTML", "CSS", "JavaScript"]}
              title={"BeFast"}
              description={
                "I am the founder of KeroKero, a digital agency that takes a fresh look at your brand and improves your online presence."
              }
              href="https://github.com/damkandev/befast-api"
              button={"See More"}
            />
          </div>
        </section>
        <section className="px-8 py-32 md:p-32" id="contact">
          <Title texto={"We need to talk."} accent={"talk"} />
          <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 items-center mt-12">
            <img
              src="/faces/contact_face.png"
              alt=""
              className="mx-auto w-3/4 md:w-1/2 lg:max-w-lg" // Ajustes añadidos aquí
            />
            <form
              action="submit"
              className="flex flex-col space-y-4 w-full md:w-1/2"
            >
              <Input placeholder={"Email"} type="text" />
              <Input placeholder={"Subject"} type="text" />
              <TextArea placeholder={"Message"} />
              <button
                type="submit"
                className="px-4 py-4 bg-white rounded-lg text-black"
              >
                {"Send"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </SmoothScroll>
  );
}
