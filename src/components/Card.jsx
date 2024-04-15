import Paragraph from "./Paragraph";
import Button from "./Button";
import Tag from "./Tag";

function Card({ thumbnail, skills, title, description, href, button }) {
  return (
    <div className="flex flex-col h-full justify-between border border-white/20 rounded-xl overflow-hidden bg-black/60 backdrop-blur-sm">
      <img src={`/thumbnail/${thumbnail}.jpg`} alt={title} className="w-full" />
      <div className="flex flex-wrap mb-2 pt-4 ml-4">
        {skills.map((skill, index) => (
          <Tag key={index} skill={skill} />
        ))}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-4">
          <p className="text-white font-Nohemi text-2xl mb-2">{title}</p>
          <Paragraph text={description} />
        </div>
      </div>
      <div className="p-4">
        <Button
          rounded={false}
          type="black"
          href={href}
          text={button}
          target="_blank"
        />
      </div>
    </div>
  );
}

export default Card;
