import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Hand } from 'pokersolver'; // Import Hand for text description
import './App.css';
import { createDeck, determineWinner, getHandStrength } from './utils/pokerLogic';
import { playSound } from './utils/sound';
import Card from './components/Card';

const BLIND = 10;
const INITIAL_CHIPS = 1000;

function App() {
  // --- STATE ---
  const [deck, setDeck] = useState([]);
  const [stage, setStage] = useState('start'); 
  const [playerHand, setPlayerHand] = useState([]);
  const [botHand, setBotHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  
  // Chips (Load from localStorage if available)
  const [playerChips, setPlayerChips] = useState(() => {
    const saved = localStorage.getItem('poker_player_chips');
    return saved ? parseInt(saved) : INITIAL_CHIPS;
  });
  const [botChips, setBotChips] = useState(INITIAL_CHIPS);
  
  // Game Stats
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0); 
  const [winStreak, setWinStreak] = useState(0);
  const [handDesc, setHandDesc] = useState(""); // e.g. "Two Pair"

  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [winner, setWinner] = useState(null); 
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Refs for Bot Logic
  const deckRef = useRef(deck);
  const stageRef = useRef(stage);
  const communityRef = useRef(communityCards);

  // Sync Refs & LocalStorage
  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { communityRef.current = communityCards; }, [communityCards]);
  
  useEffect(() => {
    localStorage.setItem('poker_player_chips', playerChips);
  }, [playerChips]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Hand Description Live
  useEffect(() => {
    if (playerHand.length > 0) {
      const format = (c) => `${c.rank}${c.suit}`;
      const cards = [...playerHand, ...communityCards].map(format);
      try {
        const solved = Hand.solve(cards);
        setHandDesc(solved.descr);
      } catch (e) { setHandDesc(""); }
    } else {
      setHandDesc("");
    }
  }, [playerHand, communityCards]);

  const notify = (msg) => toast.dark(msg, { position: "top-center", autoClose: 2000, hideProgressBar: true });

  // --- ACTIONS ---

  const dealGame = () => {
    setWinner(null);
    playSound('deal');
    if (playerChips < BLIND || botChips < BLIND) {
      if (playerChips < BLIND) {
        notify("Bankrupt! Resetting chips...");
        setPlayerChips(INITIAL_CHIPS);
        setWinStreak(0);
      } else {
        notify("Bot Bankrupt! Bot rebuying...");
        setBotChips(INITIAL_CHIPS);
      }
      return;
    }

    const newDeck = createDeck();
    setDeck(newDeck);
    
    setPlayerChips(prev => prev - BLIND);
    setBotChips(prev => prev - BLIND);
    setPot(BLIND * 2);

    setPlayerHand([newDeck.pop(), newDeck.pop()]);
    setBotHand([newDeck.pop(), newDeck.pop()]);
    setCommunityCards([]);
    
    setStage('preflop');
    setCurrentBet(0);
    setIsPlayerTurn(true);
  };

  const handleFold = () => {
    playSound('fold');
    notify("You Folded.");
    setBotChips(prev => prev + pot);
    setPot(0);
    setStage('start');
    setWinStreak(0); // Reset streak
  };

  const handleCheck = () => {
    if (currentBet > 0) {
      notify("Cannot Check. Must Call or Fold.");
      return;
    }
    playSound('chip');
    setIsPlayerTurn(false);
    setTimeout(botTurn, 1000); 
  };

  const handleCall = () => {
    playSound('chip');
    setPlayerChips(prev => prev - currentBet);
    setPot(prev => prev + currentBet);
    setCurrentBet(0); 
    setIsPlayerTurn(false);
    setTimeout(proceedToNextStreet, 1000);
  };

  const handleBet = (amount) => {
    if (playerChips < amount) {
       notify("Not enough chips!");
       return;
    }
    playSound('chip');
    setPlayerChips(prev => prev - amount);
    setPot(prev => prev + amount);
    setCurrentBet(amount);
    setIsPlayerTurn(false);
    setTimeout(botTurn, 1000);
  };

  // --- BOT LOGIC ---
  const botTurn = () => {
    const strength = getHandStrength(botHand, communityRef.current, stageRef.current);
    const rng = Math.random(); 
    const callCost = currentBet;

    // Bot Decision
    if (currentBet === 0) {
      // Bet if hand > 50 or Bluff 20%
      if (strength > 50 || rng < 0.2) {
        const betAmt = Math.min(botChips, 50);
        playSound('chip');
        setBotChips(prev => prev - betAmt);
        setPot(prev => prev + betAmt);
        setCurrentBet(betAmt);
        notify(`Bot Bets $${betAmt}`);
        setIsPlayerTurn(true);
      } else {
        notify("Bot Checks");
        setTimeout(proceedToNextStreet, 1000);
      }
    } else {
      // Call if hand > 30 or Bluff 15%
      if (strength > 30 || rng < 0.15) { 
        playSound('chip');
        setBotChips(prev => prev - currentBet);
        setPot(prev => prev + currentBet);
        setCurrentBet(0);
        notify("Bot Calls");
        setTimeout(proceedToNextStreet, 1000);
      } else {
        playSound('fold');
        notify("Bot Folds. You Win!");
        setPlayerChips(prev => prev + pot);
        setPot(0);
        setStage('start');
        setWinner('Player');
        setWinStreak(prev => prev + 1);
        playSound('win');
      }
    }
  };

  const proceedToNextStreet = () => {
    playSound('deal');
    const newDeck = [...deckRef.current];
    const currentComm = [...communityRef.current];
    const currentStage = stageRef.current;

    if (currentStage === 'preflop') {
      newDeck.pop(); 
      currentComm.push(newDeck.pop(), newDeck.pop(), newDeck.pop());
      setStage('flop');
      setIsPlayerTurn(true);
    } else if (currentStage === 'flop') {
      newDeck.pop();
      currentComm.push(newDeck.pop());
      setStage('turn');
      setIsPlayerTurn(true);
    } else if (currentStage === 'turn') {
      newDeck.pop();
      currentComm.push(newDeck.pop());
      setStage('river');
      setIsPlayerTurn(true);
    } else if (currentStage === 'river') {
      handleShowdown(currentComm);
      return;
    }

    setDeck(newDeck);
    setCommunityCards(currentComm);
  };

  const handleShowdown = (finalComm) => {
    setStage('showdown');
    const result = determineWinner(playerHand, botHand, finalComm);
    
    if (result.winner === 'Player') {
      notify(`You Win! ${result.description}`);
      setPlayerChips(prev => prev + pot);
      setWinner('Player');
      setWinStreak(prev => prev + 1);
      playSound('win');
    } else if (result.winner === 'Bot') {
      notify(`Bot Wins! ${result.description}`);
      setBotChips(prev => prev + pot);
      setWinner('Bot');
      setWinStreak(0);
    } else {
      notify("It's a Tie! Pot Split.");
      setPlayerChips(prev => prev + (pot / 2));
      setBotChips(prev => prev + (pot / 2));
    }
    setPot(0);
  };

  return (
    <div className="poker-table-wrapper">
      <div className="table">
        <ToastContainer />
        {winner === 'Player' && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} />}
        
        {/* STATS BAR */}
        <div className="game-stats">
          <div className="stat-badge">Streak: {winStreak} 🔥</div>
        </div>

        {/* TOP: BOT AREA */}
        <div className="player-area">
          <div className={`avatar-wrapper bot-avatar ${!isPlayerTurn ? 'active-turn' : ''}`}>
            <div className="avatar">BOT</div>
            <div className="chip-count">${botChips}</div>
          </div>
          <div className="cards-container">
            {botHand.map((card, i) => (
              <Card key={i} index={i} card={card} hidden={stage !== 'showdown'} />
            ))}
          </div>
        </div>

        {/* MIDDLE: POT & COMMUNITY */}
        <div className="community-area">
           <div className="pot-display">POT: ${pot}</div>
           <div className="cards-container">
              {communityCards.map((card, i) => (
                 <Card key={i} index={i} card={card} />
              ))}
              {/* Ghost slots for layout stability */}
              {communityCards.length === 0 && <div style={{width: 50, height: 100}} />}
           </div>
        </div>

        {/* BOTTOM: PLAYER AREA */}
        <div className="player-area">
          <div className="cards-container">
            {playerHand.map((card, i) => (
               <Card key={i} index={i} card={card} />
            ))}
          </div>
          
          {/* HAND READER */}
          <div className="hand-reader">
            {stage !== 'start' && handDesc}
          </div>

          <div className={`avatar-wrapper player-avatar ${isPlayerTurn ? 'active-turn' : ''}`}>
            <div className="avatar">YOU</div>
            <div className="chip-count">${playerChips}</div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="controls-bar">
          {stage === 'start' || stage === 'showdown' ? (
            <button className="btn-main" onClick={dealGame}>
              {playerChips < BLIND ? "Rebuy ($1000)" : "Deal Hand"}
            </button>
          ) : (
            isPlayerTurn && (
              <>
                {currentBet === 0 ? (
                  <button className="btn-check" onClick={handleCheck}>Check</button>
                ) : (
                  <button className="btn-check" onClick={handleCall}>Call ${currentBet}</button>
                )}
                <button className="btn-bet" onClick={() => handleBet(50)}>Bet $50</button>
                <button className="btn-bet" onClick={() => handleBet(playerChips)}>All In</button>
                <button className="btn-fold" onClick={handleFold}>Fold</button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default App;