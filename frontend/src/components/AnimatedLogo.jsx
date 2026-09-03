import { useRef } from 'react';
import logoAnimation from '../assets/chatbot.mp4'; 

export default function AnimatedLogo() {
  const videoRef=useRef(null);
  const handleMouseEnter=()=>{
    if(videoRef.current){
      videoRef.current.currentTime = 0; 
      videoRef.current.play().catch(()=>{});
    }
  };

  return(
    <div onMouseEnter={handleMouseEnter}>
      <video
        ref={videoRef}
        src={logoAnimation}
        muted
        playsInline
        disablePictureInPicture
      />
    </div>
  );
}