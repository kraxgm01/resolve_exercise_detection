import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import axios from "axios";
import KalmanFilter from 'kalmanjs';

let video;
let poseLandmarker;
let lastVideoTime = -1;
let results;

let ctr = 1;

// let coordinatesChange = [];
// let coordinatesChangeInZ = [];
let boneAnglesWithLargeChangeForRight = [];
let boneAnglesWithLargeChangeForLeft = [];

let bonesToCheckRight = [];
let bonesToCheckLeft = [];
let bonesWithGreaterChangeInZInRight = [];
let bonesWithGreaterChangeInZInLeft = [];

const marginofErrorWithZ = 40;
const marginofErrorWithoutZ = 20;
const angleForStandardDeviation = 20;
const changeInZ = 0.3;
let visibilityError = 0.7;



let countDuration = 0;
let correctSeconds = 0;
let totalSteps = 0;

let totalCounts = 0;
let currCounts = 0;



const Body = {
  "collorBone": { "right": [12, 11], "left": [11, 12] },
  "body": { "right": [11, 23], "left": [12, 24] },
  "waist": { "right": [23, 24], "left": [24, 23] },
  "thigh": { "right": [23, 25], "left": [24, 26] },
  "leg": { "right": [25, 27], "left": [26, 28] },
  // "foot": { "right": [31, 29], "left": [32, 30] },
  // "ankle": { "right": [27, 29], "left": [28, 30] },  
  // "pointedToe": { "right": [27, 31], "left": [32, 28] },
  "upperArm": { "right": [11, 13], "left": [12, 14] },
  "lowerArm": { "right": [13, 15], "left": [14, 16] },
  // "thumbBone": { "right": [15, 21], "left": [16, 22] },
  // "palm": { "right": [15, 19], "left": [16, 20] },
  // "finger": { "right": [17, 19], "left": [18, 20] },
  // "hand": { "right": [17, 15], "left": [16, 18] },
};

// Kalman filter setup
const kalmanOptions = {
  R: 0.03,  // R is low means we trust the model (previous state OR predicted values)
  Q: 0.1,   // Q is low means we trust the sensor measurements
  A: 1,     // state transition model
  B: 0,     // control input model
  C: 1      // observation model
};

const landmarkFilters = {};
for (let i = 0; i < 33; i++) {
  landmarkFilters[i] = {
    x: new KalmanFilter(kalmanOptions),
    y: new KalmanFilter(kalmanOptions),
    z: new KalmanFilter(kalmanOptions)
  };
}

let isFirstFrame = true;

function smoothworldLandmarks(worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length === 0) {
    return worldLandmarks; // Return early if no worldLandmarks are detected
  }

  if (isFirstFrame) {
    worldLandmarks.forEach((landmark, index) => {
      if (landmark) {
        landmarkFilters[index].x.filter(landmark.x || 0);
        landmarkFilters[index].y.filter(landmark.y || 0);
        landmarkFilters[index].z.filter(landmark.z || 0);
      }
    });
    isFirstFrame = false;
    return worldLandmarks;
  }

  return worldLandmarks.map((landmark, index) => {
    if (!landmark) return landmark; // Skip if landmark is undefined
    return {
      x: landmarkFilters[index].x.filter(landmark.x || 0),
      y: landmarkFilters[index].y.filter(landmark.y || 0),
      z: landmarkFilters[index].z.filter(landmark.z || 0)
    };
  });
}

function App() {
  const { exercise, step } = useParams();
  const navigate = useNavigate();
  const [toShow, setToShow] = useState("Starting in 3 seconds...");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRenderStarted, setIsRenderStarted] = useState(false);
  const [allData, setAllData] = useState([]);
  let [data, setData] = useState(null);
  const [correctPosition, setCorrectPosition] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [currCountsDisplay, setCurrCountsDisplay] = useState(0);
  const [correctSecondsDisplay, setCorrectSecondsDisplay] = useState(0);


  const setup = async () => {
    console.log("Setting up");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      },
      runningMode: "VIDEO",
    });

    video = document.getElementById("video");
    navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false,
    }).then(function (stream) {
      video.srcObject = stream;
    });

    const response = await axios.get("http://localhost:3001/api/exercises");
    const resData = response.data[exercise].steps;
    totalSteps = resData.length;
    setAllData(resData);
    setData(resData[step].worldLandmarks);
    data = resData[step].worldLandmarks;
    totalCounts = resData[step].counts;
    countDuration = resData[step].countDuration;

    // //here im getting the corrdinates with large change(which have standard deviation greater than 0.15)
    // //in short , calculating tendency for change in coordinates
    // for (let coordinate = 0; coordinate < 33; coordinate++) {
    //   let xs = [];
    //   let ys = [];
    //   let zs = [];
    //   for (let steps = 0; steps < resData.length; steps++) {
    //     xs.push(resData[steps].worldLandmarks[coordinate].x);
    //     ys.push(resData[steps].worldLandmarks[coordinate].y);
    //     zs.push(resData[steps].worldLandmarks[coordinate].z);
    //   }
    //   let x_std_dev = Math.sqrt(xs.reduce((acc, val) => acc + (val - (xs.reduce((acc, val) => acc + val,
    //     0) / xs.length)) ** 2, 0) / xs.length);
    //   let y_std_dev = Math.sqrt(ys.reduce((acc, val) => acc + (val - (ys.reduce((acc, val) => acc + val, 0) / ys.length)) ** 2, 0) / ys.length);
    //   let z_std_dev = Math.sqrt(zs.reduce((acc, val) => acc + (val - (zs.reduce((acc, val) => acc + val, 0) / zs.length)) ** 2, 0) / zs.length);

    //   let avg_std_dev = (x_std_dev + y_std_dev + z_std_dev) / 3;
    //   if (avg_std_dev > 0.1) {
    //     coordinatesChange.push(coordinate);
    //   }
    // }

    // //among the coordinates with large change, im getting the coordinates with large change in z
    // for (let i = 0; i < coordinatesChange.length; i++) {
    //   let zs = [];
    //   for (let steps = 0; steps < resData.length; steps++) {
    //     zs.push(resData[steps].worldLandmarks[coordinatesChange[i]].z);
    //   }
    //   let z_std_dev = Math.sqrt(zs.reduce((acc, val) => acc + (val - (zs.reduce((acc, val) => acc + val, 0) / zs.length)) ** 2, 0) / zs.length);
    //   if (z_std_dev > 0.1) {
    //     coordinatesChangeInZ.push(coordinatesChange[i]);
    //   }
    // }

    // console.log("Coordinates with large change - ", coordinatesChange);
    // console.log("Coordinates with large change in z - ", coordinatesChangeInZ);

    //for right side
    //console.log("Data", data);
    for (const bone1 in Body) {
      for (const bone2 in Body) {
        if (bone1 === bone2 || calculateAngleForSD(Body[bone1]['right'], Body[bone2]['right'], resData, 0) === 1000) {
          continue;
        }
        //console.log("Bones - ", bone1, bone2);
        let anglesForEachStep = [];
        for (let steps = 0; steps < resData.length; steps++) {
          let angle = calculateAngleForSD(Body[bone1]['right'], Body[bone2]['right'], resData, steps);
          anglesForEachStep.push(angle);
        }
        //console.log("Angles for right side - ", anglesForEachStep, " for bones - ", bone1, bone2);

        let angle_std_dev = Math.sqrt(anglesForEachStep.reduce((acc, val) => acc + (val - (anglesForEachStep.reduce((acc, val) => acc + val, 0) / anglesForEachStep.length)) ** 2, 0) / anglesForEachStep.length);

        if (angle_std_dev > angleForStandardDeviation) {
          boneAnglesWithLargeChangeForRight.push([bone1, bone2]);
        }
      }
    }
    for (let i = 0; i < boneAnglesWithLargeChangeForRight.length; i++) {
      if (!bonesToCheckRight.includes(boneAnglesWithLargeChangeForRight[i][0])) {
        bonesToCheckRight.push(boneAnglesWithLargeChangeForRight[i][0]);
      }
      if (!bonesToCheckRight.includes(boneAnglesWithLargeChangeForRight[i][1])) {
        bonesToCheckRight.push(boneAnglesWithLargeChangeForRight[i][1]);
      }
    }
    console.log("Bones to check for right side - ", bonesToCheckRight);

    //calculating for left side
    for (const bone1 in Body) {
      for (const bone2 in Body) {
        if (bone1 === bone2 || calculateAngleForSD(Body[bone1]['left'], Body[bone2]['left'], resData, 0) === 1000) {
          continue;
        }
        //console.log("Bones - ", bone1, bone2);
        let anglesForEachStep = [];
        for (let steps = 0; steps < resData.length; steps++) {
          let angle = calculateAngleForSD(Body[bone1]['left'], Body[bone2]['left'], resData, steps);
          anglesForEachStep.push(angle);
        }
        //console.log("Angles for left side - ", anglesForEachStep, " for bones - ", bone1, bone2);

        let angle_std_dev = Math.sqrt(anglesForEachStep.reduce((acc, val) => acc + (val - (anglesForEachStep.reduce((acc, val) => acc + val, 0) / anglesForEachStep.length)) ** 2, 0) / anglesForEachStep.length);

        if (angle_std_dev > angleForStandardDeviation) {
          boneAnglesWithLargeChangeForLeft.push([bone1, bone2]);
        }
      }
    }
    for (let i = 0; i < boneAnglesWithLargeChangeForLeft.length; i++) {
      if (!bonesToCheckLeft.includes(boneAnglesWithLargeChangeForLeft[i][0])) {
        bonesToCheckLeft.push(boneAnglesWithLargeChangeForLeft[i][0]);
      }
      if (!bonesToCheckLeft.includes(boneAnglesWithLargeChangeForLeft[i][1])) {
        bonesToCheckLeft.push(boneAnglesWithLargeChangeForLeft[i][1]);
      }
    }
    console.log("Bones to check for left side - ", bonesToCheckLeft);


    //test code to check all bones
    bonesToCheckRight = [];
    bonesToCheckLeft = [];
    for (let key in Body) {
      bonesToCheckRight.push(key);
      bonesToCheckLeft.push(key);

    }
    //test code to check all bones

    //checking which bone has greater change in z
    for (let key in Body) {
      //for right side
      let x = Body[key]['right'][0];
      let y = Body[key]['right'][1];
      if (Math.abs(data[x].z) > changeInZ || Math.abs(data[y].z) > changeInZ) {
        bonesWithGreaterChangeInZInRight.push(key);
      }

      //for left side
      let a = Body[key]['left'][0];
      let b = Body[key]['left'][1];
      if (Math.abs(data[a].z) > changeInZ || Math.abs(data[b].z) > changeInZ) {
        bonesWithGreaterChangeInZInLeft.push(key);
      }

      console.log("Bones with greater change in z for right side - ", bonesWithGreaterChangeInZInRight);
      console.log("Bones with greater change in z for left side - ", bonesWithGreaterChangeInZInLeft);

    }


    setIsDataLoaded(true);

    setTimeout(() => {
      setIsRenderStarted(true);
      renderLoop();
    }, 3000);
  };

  async function renderLoop() {
    if (!isRunning) return;  // Stop if not running

    var nowInMs = performance.now();
    let showNext = true;

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      var poseLandmarkerResult = poseLandmarker.detectForVideo(video, nowInMs);

      // Apply Kalman filter to smooth the worldLandmarks
      results = smoothworldLandmarks(poseLandmarkerResult.worldLandmarks[0]);
      let rawResults = poseLandmarkerResult.worldLandmarks[0];

      if (!results) {
        console.log("No worldLandmarks detected");
        requestAnimationFrame(renderLoop);
        return;
      }

      for (let i = 0; i < bonesToCheckRight.length && showNext === true; i++) {
        let x = Body[bonesToCheckRight[i]]['right'][0];
        let y = Body[bonesToCheckRight[i]]['right'][1];
        if (rawResults[x].visibility < visibilityError || rawResults[y].visibility < visibilityError) {
          let temp = bonesToCheckRight[i] + " is not visible in left hand side";
          setToShow(temp);
          showNext = false;
        }
      }

      for (let i = 0; i < bonesToCheckLeft.length && showNext === true; i++) {
        let x = Body[bonesToCheckLeft[i]]['left'][0];
        let y = Body[bonesToCheckLeft[i]]['left'][1];
        if (rawResults[x].visibility < visibilityError || rawResults[y].visibility < visibilityError) {
          let temp = bonesToCheckLeft[i] + " is not visible in right hand side";
          setToShow(temp);
          showNext = false;
        }
      }

      //removing visibility error once the visibility is achieved
      visibilityError = 0.0;

      // console.log("data - ",data[11].z," result - ",results[11].z);
      // if(Math.abs(data[11].z-results[11].z)>0.1){
      //    console.log("data - ",data[11].z," result - ",results[11].z);
      //   if(data[11].z>results[11].z){
      //     setToShow("Move back");
      //   }else{
      //     setToShow("Move forward");
      //   }
      //   showNext = false;
      // }

      // console.log("Collar bone and upper arm");


      //for right side
      for (let i = 0; i < bonesToCheckRight.length && showNext === true; i++) {
        for (let j = i + 1; j < bonesToCheckRight.length && showNext === true; j++) {

          let marginOfError = marginofErrorWithoutZ;
          if (bonesWithGreaterChangeInZInRight.includes(bonesToCheckRight[i]) || bonesWithGreaterChangeInZInRight.includes(bonesToCheckRight[j])) {
            marginOfError = marginofErrorWithZ;
          }

          if (compare(Body[bonesToCheckRight[i]]['right'], Body[bonesToCheckRight[j]]['right']) === 1000) {
            continue;
          }

          const aRight = compare(Body[bonesToCheckRight[i]]['right'], Body[bonesToCheckRight[j]]['right']);
          const sign = aRight > 0 ? "positive" : "negative";
          if (Math.abs(aRight) > marginOfError && showNext) {
            // let temp = bonesToCheckRight[i] + " and " + bonesToCheckRight[j] + " in left hand side is not in correct position " + sign + " detection " + marginOfError;
            let temp = bonesToCheckRight[i] + " and " + bonesToCheckRight[j] + " in left hand side is not in correct position";
            setToShow(temp);
            showNext = false;
            correctSeconds = 0;
            setCorrectSecondsDisplay(correctSeconds);
            console.log("Right -> ", bonesToCheckRight[i], "-", bonesToCheckRight[j], aRight);
          }
        }
      }

      //for left side
      for (let i = 0; i < bonesToCheckLeft.length && showNext === true; i++) {
        for (let j = i + 1; j < bonesToCheckLeft.length && showNext === true; j++) {

          let marginOfError = marginofErrorWithoutZ;
          if (bonesWithGreaterChangeInZInLeft.includes(bonesToCheckLeft[i]) || bonesWithGreaterChangeInZInLeft.includes(bonesToCheckLeft[j])) {
            marginOfError = marginofErrorWithZ;
          }

          if (compare(Body[bonesToCheckLeft[i]]['left'], Body[bonesToCheckLeft[j]]['left']) === 1000) {
            continue;
          }

          const aLeft = compare(Body[bonesToCheckLeft[i]]['left'], Body[bonesToCheckLeft[j]]['left']);
          const sign = aLeft > 0 ? "positive" : "negative";
          if (Math.abs(aLeft) > marginOfError && showNext) {
            // let temp = bonesToCheckRight[i] + " and " + bonesToCheckRight[j] + " in right hand side is not in correct position " + sign + " detection " + marginOfError;
            let temp = bonesToCheckRight[i] + " and " + bonesToCheckRight[j] + " in right hand side is not in correct position";
            setToShow(temp);
            showNext = false;
            correctSeconds = 0;
            setCorrectSecondsDisplay(correctSeconds);
            console.log("Left -> ", bonesToCheckLeft[i], "-", bonesToCheckLeft[j], aLeft);
          }
        }
      }

      if (showNext && !correctPosition) {
        correctSeconds++;
        setCorrectSecondsDisplay(correctSeconds);
        console.log("Correct position for ", correctSeconds, " seconds");
        setToShow("Correct position");
        if (correctSeconds === (countDuration * 4)) {
          currCounts++;
          setCurrCountsDisplay(currCounts);
          correctSeconds = 0;
          setCorrectSecondsDisplay(correctSeconds);
        }
        setCorrectPosition(true);
        if (currCounts >= totalCounts) {
          navigateToNextStep();
        }
      }
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        renderLoop();
        console.log(ctr++, "************************************************************************************");
      }, 500);
    });
  }

  function compare(arr1, arr2) {
    let x1 = arr1[0];
    let x2 = arr1[1];
    let y1 = arr2[0];
    let y2 = arr2[1];
    let a = 0;
    let b = 0;
    let common = 0;
    if (x1 === y1) {
      common = x1;
      a = x2;
      b = y2;
    } else if (x1 === y2) {
      common = x1;
      a = x2;
      b = y1;
    } else if (x2 === y1) {
      common = x2;
      a = x1;
      b = y2;
    } else if (x2 === y2) {
      common = x2;
      a = x1;
      b = y1;
    } else {
      return 1000;
    }

    return calculateAngle(data[common], data[a], data[common], data[b]) - calculateAngle(results[common], results[a], results[common], results[b]);
  }

  function calculateAngleForSD(arr1, arr2, resData, steps) {
    let x1 = arr1[0];
    let x2 = arr1[1];
    let y1 = arr2[0];
    let y2 = arr2[1];
    let a = 0;
    let b = 0;
    let common = 0;
    if (x1 === y1) {
      common = x1;
      a = x2;
      b = y2;
    } else if (x1 === y2) {
      common = x1;
      a = x2;
      b = y1;
    } else if (x2 === y1) {
      common = x2;
      a = x1;
      b = y2;
    } else if (x2 === y2) {
      common = x2;
      a = x1;
      b = y1;
    } else {
      return 1000;
    }
    let data = resData[steps].worldLandmarks;
    return calculateAngle(data[common], data[a], data[common], data[b])
  }

  function calculateAngle(coordA1, coordA2, coordB1, coordB2) {
    function vectorSubtract(v1, v2) {
      //return { x: v1.x - v2.x, y: v1.y - v2.y, z: 0 };
      return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }

    function dotProduct(v1, v2) {
      return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    function magnitude(v) {
      return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    const vectorA = vectorSubtract(coordA2, coordA1);
    const vectorB = vectorSubtract(coordB2, coordB1);

    const dotProd = dotProduct(vectorA, vectorB);
    const magA = magnitude(vectorA);
    const magB = magnitude(vectorB);

    const cosTheta = dotProd / (magA * magB);
    const angleRad = Math.acos(cosTheta);

    return angleRad * (180 / Math.PI); // Convert radians to degrees
  }

  function navigateToNextStep() {

    setIsRunning(false);
    setToShow("Step complete/, navigating /.................................");
    //navigate(`/exercise/${exercise}/${parseInt(step) + 1}`);
    setTimeout(() => {
      if (step < totalSteps - 1) {
        navigate(`/exercise/${exercise}/${parseInt(step) + 1}`);
      } else {
        navigate(`/`);
        //navigate(`/`);
      }
      window.location.reload();
    }, 1000);


  }


  useEffect(() => {
    setup();
  }, [step]);





  return (
    <div>
      <video className='camera-feed' id="video" autoPlay style={{ width: '640px', height: '360px' }}></video>
      <h1 style={{ fontSize: '34px' }}>Step - {parseInt(step) + 1} : {toShow}</h1>
      <h1 style={{ fontSize: '34px' }}>Hold time - {Math.floor(correctSecondsDisplay / 4)} out of {countDuration} seconds</h1>
      <h1 style={{ fontSize: '34px' }}>Counts done - {currCountsDisplay} out of {totalCounts}</h1>
      {/* {isDataLoaded && !isRenderStarted && (
        <button onClick={() => { setIsRenderStarted(true); renderLoop(); }}>
          Start Exercise
        </button>
      )} */}
      {/* <button onClick={() => {
        setIsRunning(false);
        if (step < allData.length - 1) {
          navigate(`/exercise/${exercise}/${parseInt(step) + 1}`);
        } else {
          navigate(`/`);
        }
        window.location.reload();
      }}>
        Next Step
      </button> */}
    </div>
  );
}

export default App;
