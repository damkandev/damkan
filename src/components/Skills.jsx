function Skills({ skills }) {
  return (
    <div className="inline-flex rounded-lg p-4 border-white/30 border-dashed border-2 w-auto my-4">
      {skills.map((skill) => (
        <img className="mx-2 " key={skill} src={`skills/${skill}.svg`} />
      ))}
    </div>
  );
}

export default Skills;
