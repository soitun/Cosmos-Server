import React, { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import * as API from '../api';
import { Alert, Input, Stack, useMediaQuery, useTheme } from '@mui/material';
import { ApiOutlined, SendOutlined } from '@ant-design/icons';
import ResponsiveButton from './responseiveButton';
import { useTranslation } from 'react-i18next';

import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { FitAddon } from '@xterm/addon-fit';

const TerminalComponent = ({refresh, connectButtons}) => {
  const { t } = useTranslation();
  const pingInterval = useRef(null);

  const [terminal] = useState(new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    disableStdin: false,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'normal',
    letterSpacing: 0,
    lineHeight: 1,
    logLevel: 'info',
    screenReaderMode: false,
    scrollback: 1000,
    tabStopWidth: 8,
  }));

  const xtermRef = useRef(null);

  const [message, setMessage] = useState('');
  const [output, setOutput] = useState([
    {
      output: 'Not Connected.',
      type: 'stdout'
    }
  ]);
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = (connectFunction, shellName) => {
    if(ws.current) {
      ws.current.close();
    }

    ws.current = connectFunction();

    ws.current.onmessage = async (event) => {    
      if (event.data === '_PONG_') {
        return;
      }
      terminal.write(event.data);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      let terminalBoldRed = '\x1b[1;31m';
      let terminalReset = '\x1b[0m';
      terminal.write(terminalBoldRed + t('mgmt.servapps.containers.terminal.disconnectedFromText') + shellName + '\r\n' + terminalReset);
      if(pingInterval.current)
        clearInterval(pingInterval.current);
    };
    
    ws.current.onopen = () => {
      setIsConnected(true);
      let terminalBoldGreen = '\x1b[1;32m';
      let terminalReset = '\x1b[0m';
      terminal.write(terminalBoldGreen + t('mgmt.servapps.containers.terminal.connectedToText') + shellName + '\r\n' + terminalReset);
      // focus terminal
      terminal.focus();


      pingInterval.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send('_PING_');
          console.log('Sent PING');
        }
      }, 30000); // Send a ping every 30 seconds
    };

    return () => {
      setIsConnected(false);
      if(pingInterval.current)
        clearInterval(pingInterval.current);
      ws.current.close();
    };
  };

  const [SelectedText, setSelectedText] = useState('');

  useEffect(() => {
    // xtermRef.current.innerHTML = '';
    terminal.open(xtermRef.current);

    // const fitAddon = new FitAddon();
    // terminal.loadAddon(fitAddon);
    // fitAddon.fit();

    // const onFocus = () => {
    //   terminal.focus();
    // }

    // xtermRef.current.removeEventListener('touchstart', onFocus);

    // xtermRef.current.addEventListener('touchstart', onFocus);

    terminal.onSelectionChange((e) => {
      let sel = terminal.getSelection();
      if (typeof sel === 'string') {
        console.log(sel);
        setSelectedText(sel);
      }
    });

    terminal.onData((data) => {
      if (data.startsWith("\x1b[200~") && data.endsWith("\x1b[201~")) {
        ws.current.send(data);
      }
    });    

    terminal.attachCustomKeyEventHandler((e) => {
      const codes = {
        'Enter': '\r',
        'Backspace': '\x7f',
        'ArrowUp': '\x1b[A',
        'ArrowDown': '\x1b[B',
        'ArrowRight': '\x1b[C',
        'ArrowLeft': '\x1b[D',
        'Escape': '\x1b',
        'Home': '\x1b[H',
        'End': '\x1b[F',
        'Tab': '\t',
        'PageUp': '\x1b[5~',
        'PageDown': '\x1b[6~',
        'Delete': '\x1b[3~',
      };
      const cancelKeys = [
        'Shift',
        'Meta',
        'Alt',
        'Control',
        'CapsLock',
        'NumLock',
        'ScrollLock',
        'Pause',
      ];
      const codesCtrl = {
        'a': '\x01', // Beginning of line
        'e': '\x05', // End of line
        'c': '\x03',
        'd': '\x04',
        'l': '\x0c',
        'z': '\x1a',
        'Backspace': '\x17',     // CTRL + Backspace (delete word backward)
        'Delete': '\x1b[3;5~',   // CTRL + Delete (delete word forward)
        'ArrowLeft': '\x1b[1;5D',  // CTRL + Left Arrow
        'ArrowRight': '\x1b[1;5C', // CTRL + Right Arrow
      };
           
      if (e.type === 'keydown') {
        if (e.ctrlKey && codesCtrl[e.key]) {
          ws.current.send(codesCtrl[e.key]);
          e.preventDefault(); // Prevent default browser behavior
        } else if (codes[e.key]) {
          ws.current.send(codes[e.key]);
        } else if (cancelKeys.includes(e.key)) {
          return false;
        } else {
          ws.current.send(e.key);
        }
      } else if (e.type === 'keyup') {
        // Handle keyup events if needed
      }
      return true;
    });

    // if there is only one butotn, connect to it
    if(connectButtons && connectButtons.length === 1) {
      connectButtons[0].onClick(connect);
    }
  }, []);

  return (
    <div className="terminal-container" style={{
      background: '#000',
      width: '100%', 
      maxWidth: '900px', 
      position:'relative'
    }}>
      <div style={{
        overflowX: 'auto',
        width: '100%', 
        maxWidth: '900px', 
      }}>
        <div ref={xtermRef}></div>
        <br/>
      </div>

      <Stack 
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          background: '#272d36',
          color: '#fff',
          padding: '10px',
          width: '100%',
        }}
      >
      <div>{
        isConnected ? (
          <ApiOutlined style={{color: '#00ff00', margin: '0px 5px', fontSize: '20px'}} />
        ) : (
          <ApiOutlined style={{color: '#ff0000', margin: '0px 5px', fontSize: '20px'}} />
        )
      }</div>
      
      {isConnected ? (<>
        <Button  variant="contained" onClick={() => ws.current.close()}>{t('mgmt.servapps.containers.terminal.disconnectButton')}</Button>
        <Button  variant="outlined" onClick={() => ws.current.send('\t')}>TAB</Button>
        <Button  variant="outlined" onClick={() => ws.current.send('\x03')}>Ctrl+C</Button>
      </>
      ) :
        <>  
          {connectButtons && connectButtons.map((button, index) => (
            <ResponsiveButton key={index} variant="contained" onClick={() => button.onClick(connect)}>{button.label}</ResponsiveButton>
          ))}
        </>
      }
      </Stack>
    </div>
  );
};

export default TerminalComponent;