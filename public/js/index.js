const monitor_head_one = document.getElementById('mh1')

gsap.to(monitor_head_one, {
    y: -50,
    rotation: -5,
    yoyo: true,
    repeat: -1,
    duration: 1,
    ease: "power1.inOut",
});

const monitor_head_two = document.getElementById('mh2')
const econtacto = document.querySelector('.e-contacto')

econtacto.addEventListener('mouseenter', () => {
  animacion = gsap.to(monitor_head_two, {
    x: -20,
    rotation: 15,
    yoyo: true,
    repeat: -1,
    duration: 0.2,
    ease: "power1.inOut",
  })
})

econtacto.addEventListener('mouseleave', () => {
  if(animacion){
    animacion.kill();
  }

  gsap.to(monitor_head_two, {
    x: 0,
    rotation: 0,
    yoyo: true,
    repeat: 0,
    duration: 0.2,
    ease: "power1.inOut",
  })
})

