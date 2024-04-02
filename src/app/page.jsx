"use client";
import Title from "@/components/Title";
import Skills from "@/components/Skills";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import useTranslations from "@/hooks/useTranslations";
export default function Home() {
  const { t } = useTranslations();
  console.log(t("introduction").title);
  return (
    <main className="">
      <section className="flex flex-col md:flex-row justify-between px-4 py-8 md:px-32 md:py-32">
        <div className="my-auto">
          <Title
            texto={t("introduction").title}
            accent={t("introduction").accent}
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
          <Paragraph text={t("introduction").description} />
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              text={t("introduction").seeMore}
              href="https://damkan.lat"
              type="black"
              rounded={true}
            />
            <Button
              text={t("introduction").download}
              href="/cv2024_es.pdf"
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
      <section className="px-4 py-8 md:px-32 md:py-32">
        <Title texto={t("myWork").title} accent={t("myWork").accent} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
          <Card
            thumbnail="cryptodepto"
            skills={["Next", "Node", "MongoDB", "Figma"]}
            title={t("myWork").cards.cryptodepto.title}
            description={t("myWork").cards.cryptodepto.description}
            href="https://argatio.com/"
            button={t("myWork").cards.cryptodepto.seeMore}
          />

          <Card
            thumbnail="mts"
            skills={["Next", "Python", "AWS", "Figma"]}
            title={t("myWork").cards.mts.title}
            description={t("myWork").cards.mts.description}
            href="https://mtsclub.org"
            button={t("myWork").cards.cryptodepto.seeMore}
          />

          <Card
            thumbnail="kerokero"
            skills={["Next", "Node", "Supabase", "Figma"]}
            title={t("myWork").cards.kerokero.title}
            description={t("myWork").cards.kerokero.description}
            href="https://keroke.ro"
            button={t("myWork").cards.cryptodepto.seeMore}
          />
        </div>
      </section>
      <section className="px-4 py-8 md:px-32 md:py-32">
        <Title texto={t("myProjects").title} accent={t("myProjects").accent} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
          <Card
            thumbnail="froglabs"
            skills={["HTML", "CSS", "JavaScript", "Supabase"]}
            title={t("myProjects").cards.froglabs.title}
            description={t("myProjects").cards.froglabs.description}
            href="https://froglabs.me"
            button={t("myWork").cards.cryptodepto.seeMore}
          />

          <Card
            thumbnail="ccg"
            skills={["React", "CSS"]}
            title={t("myProjects").cards.ccg.title}
            description={t("myProjects").cards.ccg.description}
            href="https://classcardgen.vercel.app/"
            button={t("myWork").cards.cryptodepto.seeMore}
          />

          <Card
            thumbnail="befast"
            skills={["FastAPI", "Python", "HTML", "CSS", "JavaScript"]}
            title={t("myProjects").cards.befast.title}
            description={t("myProjects").cards.befast.description}
            href="https://github.com/damkandev/befast-api"
            button={t("myWork").cards.cryptodepto.seeMore}
          />
        </div>
      </section>
      <section className="px-8 py-32 md:p-32">
        <Title texto={t("contact").title} accent={t("contact").accent} />
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
            <Input placeholder={t("contact").phEmail} type="text" />
            <Input placeholder={t("contact").phSubject} type="text" />
            <TextArea placeholder={t("contact").phMessage} />
            <button
              type="submit"
              className="px-4 py-4 bg-white rounded-lg text-black"
            >
              {t("contact").send}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
