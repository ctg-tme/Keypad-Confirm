/********************************************************
Copyright (c) 2026 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the 'License'). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an 'AS
IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*********************************************************

 * Author(s):               Robert(Bobby) McGonigle Jr
 *                          Technical Marketing Engineering, Technical Leader
 *                          Cisco Systems
 * 
 * Date: April 2, 2026
 * Revised: April 2, 2026
 * Version: 1
 * 
 * Descriptoin:
 *  - Replaces the normal Keypad with a new Keypad
 *     - This new Keypad performs the same role, but alters the User Experience
 *        - DTMF Tones are NOT sent immediatley when pressed
 *        - Characters pressed on the new Keypad render in a TextBox above the new KeyPad
 *        - When ready, press enter the the DTMF sequece will run
 *        - Backspace and Clear buttons available to alter the sequece
 *        - Keypad clears on Close
 *        - Keypad closes on Entry
 *        - Cursor Animation in Text box, as a POC and to indicate to the user that this is an editable field
*/

import xapi from 'xapi';

const keypadPanelId = 'keypadConfirm';
const keepadWidgetIdPad = 'keypadConfirm~keypad';
const keypadWidgetIdText = 'keypadConfirm~viewport';
const keypadPageId = 'keypadConfirm';

const CURSOR = '|';

function stripCursor(str) {
  return str.endsWith(CURSOR) ? str.slice(0, -1) : str;
};

function withCursor(str) {
  return str + CURSOR;
};

function toggleCursor() {
  if (currentSequence.endsWith(CURSOR)) {
    currentSequence = stripCursor(currentSequence);
  } else {
    currentSequence = withCursor(currentSequence);
  }
  setDTMFFeedback();
};

let currentSequence = '';

function appendDTMFSequence(val) {
  let clean = stripCursor(currentSequence);
  clean += val;
  currentSequence = withCursor(clean);
  console.debug('DTMF Updated:', currentSequence);
};

function backspaceDTMFSequence() {
  let clean = stripCursor(currentSequence);

  if (clean.length < 1) {
    currentSequence = withCursor('');
    return;
  };

  clean = clean.slice(0, -1);
  currentSequence = withCursor(clean);
};

function clearDTMFSequence() {
  currentSequence = '';
  console.debug('DTMF Cleared');
};

async function sendDTMF(options) {
  let thisTarget = options;

  const clean = stripCursor(currentSequence);

  if (clean === '') return;

  await xapi.Command.Call.DTMFSend({ DTMFString: clean, Feedback: 'Silent' });

  await xapi.Command.UserInterface.Extensions.Panel.Close(thisTarget);
  console.log(`DTMF Sent:`, clean);
};

async function setDTMFFeedback() {
  await xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: keypadWidgetIdText, Value: currentSequence == '' ? '' : currentSequence });
};

async function buildUI() {
  await xapi.Command.UserInterface.Extensions.Panel.Save(
    { PanelId: keypadPanelId },
    `<Extensions><Panel><Order>1</Order><Location>CallControls</Location><Icon>Custom</Icon><Name>Keypad</Name><ActivityType>Custom</ActivityType> ${keypadIcon} <Page><Name>Select Keys and Press Enter</Name><Row><Name>Row</Name><Widget><WidgetId>keypadConfirm~spacer1</WidgetId><Type>Spacer</Type><Options>size=1</Options></Widget><Widget><WidgetId>keypadConfirm~viewport</WidgetId><Name></Name><Type>Text</Type><Options>size=2;fontSize=normal;align=center</Options></Widget><Widget><WidgetId>keypadConfirm~spacer2</WidgetId><Type>Spacer</Type><Options>size=1</Options></Widget></Row><Row><Name>Row</Name><Widget><WidgetId>keypadConfirm~keypad</WidgetId><Type>GroupButton</Type><Options>size=4;columns=3</Options><ValueSpace><Value><Key>1</Key><Name>1</Name></Value><Value><Key>2</Key><Name>2</Name></Value><Value><Key>3</Key><Name>3</Name></Value><Value><Key>4</Key><Name>4</Name></Value><Value><Key>5</Key><Name>5</Name></Value><Value><Key>6</Key><Name>6</Name></Value><Value><Key>7</Key><Name>7</Name></Value><Value><Key>8</Key><Name>8</Name></Value><Value><Key>9</Key><Name>9</Name></Value><Value><Key>*</Key><Name>*</Name></Value><Value><Key>0</Key><Name>0</Name></Value><Value><Key>#</Key><Name>#</Name></Value><Value><Key>back</Key><Name>⬅️ Back</Name></Value><Value><Key>clear</Key><Name>❌ Clear</Name></Value><Value><Key>enter</Key><Name>✅ Enter</Name></Value></ValueSpace></Widget></Row><PageId>keypadConfirm</PageId><Options>hideRowNames=1</Options></Page></Panel></Extensions>`
  );
};

xapi.Event.UserInterface.Extensions.Widget.Action.on(async ({ WidgetId, Value, Type, Origin, PeripheralId }) => {
  let thisTarget = {};
  if (Origin) { thisTarget = { Target: Origin }; };
  if (PeripheralId) { thisTarget = { PeripheralId: PeripheralId }; };

  if (Type == 'released' && WidgetId == keepadWidgetIdPad) {
    await xapi.Command.Audio.Sound.Play({ Sound: 'KeyTone' });
    await xapi.Command.UserInterface.Extensions.Widget.UnsetValue({ WidgetId: keepadWidgetIdPad });
    switch (Value) {
      case 'back':
        backspaceDTMFSequence();
        break;
      case 'clear':
        clearDTMFSequence();
        break;
      case 'enter':
        sendDTMF(thisTarget);
        break;
      default:
        appendDTMFSequence(Value);
        break;
    }
    await setDTMFFeedback();
  }
});

xapi.Event.UserInterface.Extensions.Event.PageClosed.on(async ({ Origin, PeripheralId, PageId }) => {
  if (PageId == keypadPageId) {
    clearDTMFSequence();
    setDTMFFeedback();
  };
});

async function init() {
  await xapi.Config.UserInterface.Features.Call.Keypad.set('Hidden');
  await buildUI();
  setInterval(toggleCursor, 500);
};

xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(count => {
  if (count < 1) {
    xapi.Command.UserInterface.Extensions.Panel.Close({});
  }
});

init();

const keypadIcon = `<CustomIcon><Content>iVBORw0KGgoAAAANSUhEUgAAAm8AAAJvCAYAAAFaMQYeAAAAAXNSR0IB2cksfwAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAd0SU1FB+oEAhQuN4wXW4AAACAASURBVHja7d1rbF3neSjotUiJpERSd0eW7TQOnDSDBNNMegZogQzQPz1AB+gBXKA96DQt2gmaJh00P4JBfmSADpAAOUB+5AAn1l2+25JiXW3Jdq2LI8tRJFm+SNaNkq37hSIlihTFTfG+v/kxUeqktkxu7r32ujzPT1ub336/d33ver+1914rigAAAACAXFi+fPmC8BFTeW34HbV+3VTFtfrD93rTcRzHlby2Vq+rREPajtJ7Tfi9/t/bb7/dU8nrUnXEfdobvXHjRvSZz3wmruS1n3T0VPq6TE1cLSYg6YmryVL9tDdZi5qTtNTVuHtNaqX/b3BwMFtZCR8j6XZk9+7dWzSGAORDR0dHCCGEd95551alZ+WkXpeKTf4ndfOTaX4r3ayPj4+HxsbGRBru1F0dqcVVlcxsuVauXPlgmq6cZGap2uTb5Gdnk1+LCwCZmrhPCqTSo7FcLtdszNTq7u6uqHC/9dZblysd88SJEyECgNyo9DOH8+fPV+2ziqS3YjWZtMkEsn///o5KXjedMXN/dST3e9VPCyJzyyepiSuVSvf8/4cOHbqS9YnLzVKdzpip2uR/0qb8047GWlwByeQmvxrfyBweHp70a5944omvZrYVAUAfl0gfmLaWIs7CpKVx8uKsTFraJi9Tn6vmfpNv4nByKMQRt2LFioVpnjQAAAAAAAAAAICcqPRXyoODgyHpu/JPVUMtJ20y/+3j/s3s2bP/w3+7du1aqNWYqZm4Wtzn7f777694zDNnzuTj7vq1+F19Ln6TXwSpmrgsfc838TsW1mpyent7c5GQabUGld5w5aWXXvphpu9yAwCTOkNO9XXlcjmEEMJjjz3WlNSYdd9y3WsLVOnd9St9XQghamhoyMYj9Kazyf+k/1/p62rV+zakbVln5e/a5Ju4HExcf3//J/6/jo6OxDfjuXj0StJn1cz+JP2ll1764caNG79TyWsvXLhQUVE/fvy4qyIAJC/RR+hNtjXIQjuSuj6uHo/eS83OodKrI6+99tqTWdnk+wqETX4ONvlp2oxnqsbV4w75uX724GSCi3+tkkn53X+3bt26v3DDPgDyscmv1u4jjWfGhjRO2O9un0IIYenSpbMdcRXuc915usKNuqVqk19dq1ateshZNec1LjOPJbBZBwAAAAAAAAAAAAAAACA7tm7d+oOkx1y7du2jSY63evXqR1avXv1IlvOUyZ8uTuUn59X6eeZkx+zp6Ynuu+++RMcs/IPfauXDDz+s6PGqr7766vLpJH0qYy5atGja92Co9HlvKlwdK1s1qsB0k5iVMVW4GiTC0xodcFOyfv36v8rzyielVa5SSY+5cuXKB5Me0xGSggOvGuNt3779J0mP6WBLqbvPDb1rbGwsJH3AHz58eDzpMWUeAADIpcxeDJ3MTq3aF3s/bczbt29Hc+fOTXTMrF3QbsjigTbZywLVuoQw2b8zZ86cqox5/PjxSV/+uPvvzp8/78P7elS1aleCInxhQIWrQSIqeb0LrE6pFSuVSrLtgEvuVNHe3h4nPWYlLl26VPFr+/r69HBpOLVO98CZ6pijo6NRc3NzomNmZbeauVPq3edHv//++/f8dzt37nzu4541PZ0xJ/vvpnuwVTKmkzUAAEC9/eIXv3j1477fX8vbPoyNjSX+mwK/Y6ij559//s+L8IOWvP6Ixof3NRpzOl9VqnTMLFyPy8yF346Ojmmt4s2bN38vyQN8zpw5iS+qLFS6zFS4akzmVCuAe4sUuMJNdyIref3AwICmucg9XKUVYDoHaz36KT1cyird9evXJ/VvT58+XZXKOJW/UY0P0+sxJgAAABSPrfQk5fGZCQ64DB9oDrzJaTAFn2xiYiLXH6Q74NI2OQ2mxwGHAy63De40+rDjx4+bQJuGygwNDYWWlhYbBpL3b//2b6v9oAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADWrFnzpVWrVn0uyTHXrVv3l0nHuXXr1h9kPVeZfa7npz0yshbPLL3XmKVSKWpvb090zCw+lzXO48FW7YTcunUrzJ07N0pyzKk8gzVLB15DXg+2qf7bT3Lz5s1JH2zVGnOqfyNLDwhuyOvBVq1kLFiwIEpyzDfffPNAJa97//33PZW6mjo7O0Ol9uzZs7PSA7xS01lUSY+ph6tBpaqkz8namFno5TLXw+XZ4ODgtA7wcrmc+iqnwqVozGqcFtNe5VQ4HHBFNd3qtGbNmi84pRb0lFrpwWPTkIPVX+lr165d+1/U3YJWuCiKouHh4dDc3Dyl13R3d0f3339/xXFWUnGmW2nqMaYK9zFaWlqmPKnTOdgqSeSGDRv+z6SreRY/xM+Uffv2Hf60q+4bNmz4x2r3kElf6c/Lpwu5sXTp0tlJJ+Do0aOJJ318fPy3xsvCBV4AAAAAAAD+g6Q/ZlqxYsXij443MTFR8zGPHDnyWzEeO3Yssx9tudXDJJVKpdDa2holOeZkFlDWvikS5+1A+6ixsbGoqakpTnJMt3q4t0x9H+7atWtTOpXMnDkzevvtt3uSSnwl/z4tY6pwVZzY6VSApMf0m4aMH2zTea0vOBb8lFqEauyAIzMHaRYOcgccDriiGh8fd8CRnJkzZyb6k0YH3D0MDg5W/NqOjo7E36/fimb8gGtra6s4gV/+8pfjrBw058+fr+h1169fz0Qec/3RVjUOmvHx8dDY2JjogZrnWz24bf4klMvlMNk/5bPUHG4aJjPB1UxCQ0NDnPSYcRzHe/fu3XOvf3Po0KEresU6OHnyZDh+/HiiFz0vXrwYDh48eD6p8TZv3vy97u7u8OKLL/6rjAMAAAAAAGROPW4l/3HjjYyM1GzM7du3/+Tjxty5c+c6R0CdD7RaHniTGe+DDz5IfMys5a4hiwdbLf5tNf7OF7/4xcTHDCGElStXPqgM1bGyVbMKVDLerl27NiQ9ZlZy6FYP93Dnzp0wa9asKMkx3eoh4wfbdF5b6cEWRVG0adOm7zonFfB0Op1TTtJj7ty5c910xjt06NA1p9QUVLhKTzdJj1mNXiztp1U/hMYBV1TT/cF2V1eXXWpRT6mVPvo877tUl0VSlnyXRQqs0gSWy+XEx8zK71Mb8n4ATDcRlby+sbFxWmMODQ1N6d9n6TZfmatwUzkAqrXqkx5z9uzZ8blz5yb1bzs7O6d9my8mYdOmTd/9pAugtfowe3R0NPHPMvP0TREAAAAAAADIEB/6TsG9Pr90+/rJ8X24SVi5cuWDn/ZhuQ/UqYpnnnnmT/L6K3in1IydRu85sU6xTqlJHWw44BJXy3vGOaWqcE6rKhwOOBxwpgAHXB6aY/2bA26qJvvbUOxS67pTVd1UuMROjaVSyaSpcMlUOpVNhatqpfukA2r79u3/zcEGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApEWYpPHx8ZDVGPfv398x2Tj37t37y6zGOTExMakYy+VycORT6IKW5UWydu3aR6sV55o1a76U91yGEBS8GopNQTKLoWYJjONU5HB0dDTMnDmzJn97eHg4mjVrViyXTFWDKaj9WT7rY9zL0qVLZ4cQalbcoiiKWlpaonp3OkXIpQ6OVJzp09IBXL58OTz00EOJxvjBBx9EX/rSl2K5RAdXoOKW9LhPPPHEV5MublEURb//+78vlyhw9XLw4MHz9Rz/ySef/E9JjPPNb37zSN5PIBs3bvxOPXO5e/fuLVaULarurQ7bm3rHWYQYbVV1cAAKXFLGxsbqOv7JkycloUouXbpU1/EHBgYkwRbVNrUeW5rx8fHQ2NhYlxiHhoai2bNnx3KJDq4ONm7c+K28L4gZM2bUbfElVdzqWWSeeuqp/9VK0sHp5Oq8EJPucIoQp85NB5eNs0dCB2o9F0Qcx/GyZctakxin3nEqbjo4EuoAxsbGoqampjjvcaZxwVf7+mMIIWpoaLAWdXDZ7ubu6unpqehvnDt37jd/J43F7XfjrOffqKUZM2b85v1dvny5or/R3d39mzgVNwAAAAAAAAAAAAAAAADgo3bt2rWhkiegr1u37i+zFGe5XJ5yjOPj45l6mtSmTZu+W0kuX3755Z9aCeRGf39/qKaLFy+mshCEKktjjJ2dnVWNsaenxyMCa8RdDBJY8LX8+8PDw9GsWbPivMeZhjuLjI6OhpkzZ9ay440aGxutSQVOcUtLAXBH33wWcwWOVC38eiyMem0hixCnIlcdbniZo4Wf5LilUqlu142SvGZVhFwqcGRi4UdRFL3zzju3khintbW1bjEuXLgwkXFOnz5d11x2d3crcraourd6bG/qHWcRYrRV1cEBKHBJOXHiRF3Hr9dDp/PotddeW1PP8Q8ePHhGFkjlNrVekopx27ZtP65XjEn+oqMIucwz+/saLozEk5nw9ZqBgYHQ1taWaIy9vb3RwoULfU0EW9S6njkSPkDrsSDa29vj119/fWuCXeOPki5uRcklVGTFihWLi7CNKcp2zZYUElgcaY3x5MmTVYvxyJEjQS4hg1588cV/ncoieOaZZ/4ki3EODg5OOsaBgYFMLva1a9c+OpVcbty48TtWAAAAAAAAAAAAAAAAANTEnj17dl69ejUMDw+HS5cuhR07djybtxhXr179yKlTp8KtW7dCX19f6OjoCCtXrnwwb3Hu2rVrw+XLl8Pw8HC4cuVKeP3117c5wimEDz/8cFo/zD5w4MCHWYizCD9Af/fdd0vTifHEiRN+aE8+Opci3F6nKLcRcquk7HBjvQQWQ82TWOcbJJbL5VDrtzAxMRHNmDEjlkumwh19a2RgYCCxM3MIIZw9e7ZuDyhOYk02NjbW7TF+V69eTTSXvb29OjodXHoNDQ2FlpaWxMc9e/Zs9IUvfCGxnNar4CTZ5XR2doYlS5YkHuPt27ejuXPnWp8KXDG3pfVe/EV48HNRcmmLSmYWfqlUsr2pkvHx8VDkY0kHRyoPyiTO/EXo4IqSSx0cgALHsmXLWp3xc7K9qfNcyqUtqm1qHRdFET5F9SGDAkdKFkY9FkTScRYhRsXNFjUT25uLFy8mMta+ffveqdeCSHLcesb47rvv9icx1unTpxU3HVy21OqnTENDQ9Hs2bNTk8NadTppWvAjIyOhqamp6n83DT9F08FR2SQ3NMR3VWvBx3Ecp6m4ffR99fX1Tftv3bhxI6rmnFVLc3NzTXKpuJFLBw8ePH+vu0zk5V5iw8PDnxjj0NBQLr7Qunfv3l/eK5f79+/vcMQDAAAAAAAAAAAAAAAAFbpw4cKnPvi4Xo89JN/8wJeqq9ZdRdw2iOlyNxGqYs+ePTvvdmPVLJQhhPDqq68uN8Po4Mh0x6ajQwdHamzcuPE7Sd7OO4QQnnrqqT8y8+jgyE3nppNDgaMQxU2RwxYVQIEDFDgABQ4gPVyopWI+RUWBQ5FT3LBFJZNnyDiOu7q6aj7OxYsXFTegfrq7u0O1XblyxV1GgHTp7e2tuKhdv35dUQOyaeXKlQ+uWLFisZkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuJfYFKTH+vXr/7pcLg9/4xvfeDGvMa5evfqR++6777/euHFjwz/90z+dzWuca9eufTSO4xl/8zd/s8mRTaG8/fbbPWGSdu/evSWrcZbL5UnFODExEbIa4xtvvPGLyebywIEDHzr6dW65NDw8HJqbmyt67a1bt6L58+dnImchhIqLVRzHmYjx9u3bob29vaLX3rlzJ2ptbbX+aqjBFCRj69atPwghVFzYoiiK5s2bN62ikVRRm+57rMbfqPXWOoRQcWGLoiiaPXt2FEIIa9eufdTq0LllVqlUCq2trVX9m52dndGDDz6YqvzVoiClrYu7fv16uO+++6r6N/v7+6N58+ZZi4pbtkxMTISGhto0yKVSKWpvb09FDmvZaaWlwA0NDYWWlpaa/O3x8fFo5syZ1qNtaTYMDAzUrLBFURS1tbVF58+fr/v2rdZbyDRsUTs7O2tW2KIoimbMmBH19vYGq0ZxS73nnnvuz9ra2mo+zsMPP5zrwpaWArdkyZKajzF//vxo+fLlC6weUi0krB4xHj58eDzJGH/1q18dk0uoo56enqTXQ3jnnXdu5X3R12Phd3R0JB7jlStXFLgqcAEzR1uoJC+8f/DBB+GLX/xiPbrFkT/8wz9skUs+jWtuVbZp06bvFiHOehS2KIqir33ta81FmN+nn37661aTzk3XVoczfj3jLEKMujedG3Wwc+fOdfUcf/Pmzd+TBXRuOreqq+UXkydjeHg4mjVrViyXKG6KW65iLEqcipttKYDiBihuAIobxdHf31/X8a9evSoJKG5U389//vOH6jn+Qw895EI7n8pBUmX1/IStt7c3WrhwoS/xVsng4GCYPXt2XWIsl8tRY2Oj9am4KXBJLvqiFLei5NK2FD7i8ccf/58sehS3gtm+fft/y/ui/9a3vnW6CLlcvnz53KTHXL9+/V9ZRbaltqZ17miSjLMIMepOdW7pP2skeIDWczGUSqVExunr65NLFLe0eO655/5z3hdDUk/fWrBgQV3jTGKeV6xYsdCqITP27Nmzs1a3o3788ce/kqZteN6fKbB+/fq/rlWMr7zyyv+wWsic5cuXLyjCQ0TK5XJVYxwfH09lnB4IAzVaFGmOcdeuXRuqEeP27dt/IpdQkCKXpRivXbtWUYyXL18OcgkZd+LEiU9dBIcOHbqW9TgnJiYyuf2civfee2/403J59OhRRQ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmIbVq1c/kvenQkVRFB07duyeT4U6cuRI5uN87LHHmu71lK9yuRxWrlz5oKOeXKvkOZdjY2OZKgDbt2//SSVxbt68+XtZinN8fHzKMZbLZY/4S0BsCpIzNDQUWlpapvU3ent7o4ULF6Y6b9V46HAcx6mOsb+/P8yZM2daf2NwcDBqa2uzBhW37HdrVU1cChf/jRs3wqJFi6r297q6uqIlS5bEconiVpDClsZFUS6XQy3ezsTERDRjxoxYLpmqBlOQzcVQ6789xQIUarU2Gxsbo9HR0SCXKG4FKWxpWRRnz54NDQ21PYxmzpwZnTx5MsgltqUFKWxp2LolGWe9tm612nLbourcMmfp0qWzkxyvsbEx9wW8np2NWqNzo/6LMM57nEWIUfemc6OABdx1KRS3OqnnLwnOnz9v4VfR9evX6zafg4ODcmlbqqOpx3amnnEWIUZbU50bddDV1VXXRf/hhx/qatC56dzyF2NR4tS56dwAFDdAcQNQ3CApExMTJgHFjeo7cODAqXqO//rrrz8nC3wan8ZUme+5iTFrcercmJQ333xzX73GXrVq1UMyUD1r1679L/Ua+9VXX/2ZDOjcdG91ONP39PSEhQsXJh7jlStXos9+9rOxXKJzq4PR0dG6LPokLVq0qC6LL8nC9usinniMg4ODFpHOTfdWzzN9V1dXWLx4cWLjXbx4MXr44YdjuUTnVkeHDh1KrJV67rnn/nM9Yrz//vsTXYT1KGxRFEUvvvji/5PUWG+88cYuq0fnpnuLoujOnTtRa2trnPc4693NjIyMhKamppqOUS6Xo8bGRmtScVPg0rSFqWWcRYjRdtS2NHtnjxodsGNjY6laDLV6L2mLsRa/jgghKGyKW3YL3Llz56r29w4ePHimqakpTmOcee9kZsyYER85cqRqFe7UqVNRQ0ODwkY+tqnTkYUYDxw48OF0Yty7d+8v5RIyamhoaNKL4NatW5lcCBs2bPjHqSz2tWvXPprFOAcGBiYdo2cjUDiHDh26dunSpXDhwoVw4MCBD/MY49atW39w4sSJ0N3dHY4fPx42b978vTzGefDgwfMXLlwIFy9eDG+99dZlRzcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADU0Zo1a750+vTp0N/fH3p7e8PJkyfDsmXL5uQtztdff33blStXwvDwcLh8+XLYvXv3lrzFuGLFisUdHR2hr68v3Lp1K5w6dSqsXr36EUc5hTExMTHpx8ENDQ1l8nFwO3bseHYqj/Z7+eWXf5rFOEdGRiYd49jYmEf7kU9FeJDv8ePHpxXje++9NyyXkBGdnZ2hWo4ePRryuuCzsPhPnz5dtRgvXLigyNVIbAqSWfDV/pvlcjlqbGyM8x5nHMepirFcLodavKW0xZkHDaYgews+iqKooaEhSkt3s2zZsjm1ei9p6uBCCKFWNcg2VeemsP2OkZGRqKWlJc57nPXubMbHx0NjY2Ot5zFqaGiwJnVu6ZbUdbHm5uZo06ZN381zYat3Z7Njx45na13Yfl3AowMHDnxo9ejcCt+11buzuXnzZliwYEFi4127di164IEHYrlE51Yn9fguU1dXV+JjJlnYoiiKlixZkngu+/r6Ep/XrH6vUeema8vFGf/WrVth7ty5icfY3d0d3X///bFconNLWD2vmTzxxBNfTWqsehS2KIqixYsXJzbWCy+88A/1yuWuXbs2WE06N11bHc749YyzCDHq3nRu1MHBgwfP13P8PP7gHp2bzi0FZ/t6x5jUrzN0bjo3SPagbXDYorgBihuA4gaguJEvnZ2ddR3/9OnTksCn8mlMlfmemxizFqfOjUkZHR2t29hnzpyRgCrq6uqq29ilUkkCdG66t3qc6YvQuRUllzo3SMHis+hR3Aq28C16uURxy52xsbFCLPx6LfpyuewgU9yox0Jsamqq25n+1KlTiYxz+PDhkXrFmORTxnRtVZxLU1Bbtb4gnYbFMDo6GmbOnFmzvz88PBzNmjUrlksUt4IUuDQthlo9HWp0dDRqbm6O5RLb0oJsUdO2GGbMmBFfvXq1qn/z/PnzqSpsRcklTNnt27fDdF29ejX1Dw8JVZD2GLu7u6cdYz0ePgM138JN1eDgYKYWwtq1ax+tZME/9dRTf5SlOIeGhqYc4+joqKJG/o2Ojn7iIiiVSrlYBL/61a+O3Wux792795d5iPPOnTufGOPIyIiCBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwqZ544omvTuZxd6tXr37EbAGpd+vWrYoeVNzT0+MReED6HDx48Hw1njj/5ptvHjCbTEdsCqiWEEKo8t+LGhoaHKMobuSnsP3WQRrHjlMUN/JV2BQ4KtVgCpiOoaGhRD4AGBgY8EEDOjfy1bXp3lDcyG1hU+CwLSURzz333J/VY9zly5cvMPvo3MhV16Z7Q+cGKG6mgKlas2bNl8wCtqXkzu3bt0N7e3vdxr927Vr0wAMPOHZR3Kiuel5v+82B67obtqWA4gaguAEobuRIuVyu6/h37tyRBBQ3qm/Hjh0r6jn+K6+88i1Z4NP4xImK+IUCOjcAxY2sOHHiRF3GPXjw4Bmzj20pudua2pKicyN3XdTrr7++1ayjcyN33ZuuDcWN3BU4hQ3FjdwVOIUNxY3cFTiFjUr5QIFUFqJyuaywoXMjX12coobOjVR3cXEcx2NjY5P69yMjI795jdkDMunpp5/+ulkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBjtm3b9uObN2+GSly5ciWsX7/+r81iOmzduvUH169fryiXXV1dYePGjd8xi+mwcePG71y7dq2iXF6/fj1s3br1B2YRIOOWL1++oFQqhSRcv349mPHa6u/vTySXvb29clljlW6epur27dtyCZB2le7cq+3kyZNOGtN08eLFVOTy7NmzcjlNZ86cSUUuL126JJcAaXD27NmQZgcOHPhQlibn5MmTqc7lkSNHnPwn6fDhw+NpzuWpU6fkkkyJTQF5MDo6GmbOnJmZ99vX1xctWLDA+vsYd+7cCbNmzcrM+y2VSlF7e7tcfoyBgYHQ1taWmfc7PDwczZo1Sy5JvQZTQJaNjIyEEEKmGrcoiqL58+dHIYRw48YNO/5/b4JCCCFTjVsURVFbW1sUQgj9/f1y+Wu3bt0KIYRMNW5RFEUtLS1RCCEMDg7KJZo3qLYTJ06EEEJoamrKdByLFi2KQgjh5Zdf/mlRc/n222/3hBBCa2trpuOYM2dOFEIIe/fu/WVRc7lnz56dIYQwd+7cTMcxe/bsKIQQ3n333ZJqSxq5PEzmhBByuSu+c+dO1NraWqg1OTExERoa8reHHBsbi5qamgqVy6x9dWEK9SZqaGhwrkTzBhq3eyzKOI7lUi7lUi5B84YThBOFXMqlXMolOeA7bzhBpNDExESQS/GKTbygeSOTivjLr4aGhuj48eO5i/vmzZuFPPldvnw5d3FfuHChkLn01A3SwCVg7HbTvEBz9jGNXMqlXEIVNvimgDS7detWoXe5eXoiw8WLFwudyxMnTuQm/qNHjxY6l1euXHH1jfpuIEwBdvd2+XIpl3JZzFySTa68AQBo3gAA0LwBAGjegLQaHh42CTmRp6+JlctlCQXNG3y8M2fOFDr+nTt3/igvsbz77rv9Rc7l3r17d+UlljfeeGN7kXN5+PDhEdWZevJrGVLP/aTkUi7lUi7h37nyRuodOXJkoohxr1u37i/yFtPevXv3FDGXr7zyyn/PW0zbtm37URFzuW/fJa+JygAAEbJJREFUvndUZeq+gTAFZMHo6GiYOXNmYeK9cuVK9NnPfjaX67NUKoXW1tbC5LK3tzdauHBhLnPZ09MTFi5cWJhc3rlzJ2ptbXXeRPMGk1Uul0MRPq3o6+uLFixYkOtAi9KMF+FkX5RmfHx8PJo5c6ZzJqngY1Oyc7A2NMQjI/n+nnBnZ2fuG7coiqKmpqa4VCrlOsbe3t5CXKVpa2uLb968mesYS6WSxg3NG1SqpaUlPnfuXC5j271798YHH3ywMCeI9vb2+NixY7mM7a233rqQ149KP86iRYvigwcP5vKn4SdOnIja29s1bqSKA5LMysuv3SYmJqIZM2bEcpmTolrwXyLm6esNflVKWrnyRqYL66uvvvqzrMdQ9Mbt7jy88MILf5flGJ588sn/xcn+//96w5o1a76Q5Rg2btz4LbkEqLEtW7Z8P2SIjH2yZ5999k+zlMsVK1YslrWPt2zZsjlZyuXzzz//57JGJja8poC8uXXrVpg7d27q3tfFixejhx9+2Jqbghs3boRFixal7n11dXVFS5Yskcsp6OzsDEuWLEnd+7p582a0aNEiuQRI0Um2rjv5U6dOucpWJZcvX65rLs+dOyeXVXL27Nm65vLKlStyCZAVx48fr9kJoVwuh/3793eY5WQcPnx4vJYn+EOHDl0zy8l46623atqZHzlyRLMGkEfbtm378cmTJ0NfX18YGxv7reI/MjISenp6wpEjR8KmTZu+a7bS7cUXX/zXY8eOhd7e3jA6Ovofcnnz5s1w9OjRsGXLlu+brXTbsmXL948ePRpu3rwZRkZGfiuXo6Ojobe3Nxw/fjy89NJLPzRbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwGTFpgD+3erVqx954IEH/q+2travtbW1/WFzc/PcO3fuXCmVSodLpdLhy5cv/+Rf/uVf7pip9Fu1atXnPprLlpaWhUNDQ113c3n16tWf/fM//3O3mUq/5cuXL3jooYf+71/n8muzZs26f3h4+GapVHqvVCod7uzsXP7tb3/7opkCyGlzduPGjVAL58+fD2Y4OUuXLp3d1dVVk1xeuXJFLhN2+fLlmuSyq6srLFu2bI4ZBsiIXbt2bQh1MjExEZ577rk/k4Xq2LZt24/rlctyuRw2btz4HVmojg0bNvxjuVyuVzrD9u3bfyILACny3nvvDYcUevnll38qO1Ozf//+jjTm8he/+MWrsjM1u3fv3pLGXB44cOBD2SFrfOeN3JiYmAgNDQ2pf5+lUilqb2+39u5hdHQ0zJw5M/Xvc2RkJGppaZHLexgaGgotLS2pf5/j4+PRzJkz5RLNGyQhhJDJ7ydNTExEM2bMsAZzkMsQQtTQ0CCXH1Eul0McZ3NK4qy+cQqjwRSQVePj4yGrJ/soiqLGxsYohBB6e3sL/+X44eHhTOcyjuMohBBKpVLhczkwMBBCCCHL/U8IIQwPD/vRCpo3qJa7351pbGzMRTzz58+PQgjhscceaypaLrds2fL9EEJobm7ORTytra1RCCE8++yzf1q0XD711FN/FEIIbW1tuYinubk5CiGEl1566YeqLsA01OrWEGnx9ttv9xQll+fPn891Ljs6Ogpz5ebEiRO5zuXFixddhSNVfK5PZpRKpdDa2pr7OM+ePRt94QtfyPXa7O3tDfPnzy/CZiNasmRJrnN59erV8MADD+Q+l7du3Yrmz5/vnEkq+NiUrBTOQjRuURRFjzzySPTee+8N5zW+zs7OQjRuURRF999/f3TmzJncXrX54IMPCtG4RVEUzZs3L+rq6nIFDs0bTMbOnTvXzZ07t1Axf+1rX2vOY1wbN278zpIlSwqVy0ceeSR68skn/1Pe4nr88ce/8sUvfrFQuVy8eHG0efPm76nK1JtLwKReln+FOO0FmrNbFsilXMolTJ8rb6TakSNHCv0xxbp16/4yL7Hs3bv3l0XO5SuvvPI/8hLLtm3bflzkXO7bt++w6kxdNxCmALv79Orv74/mzZsXy2X2jY2NRU1NTbnI5cjISGhqaipyOl19Q/MGTvj5P0nIpVzKJVSHj00BADRvAABo3gAANG+QXsPDw4WO//33389NLDdu3Ch0Ls+fP5+bWM6ePVvoXPb29irO1JUvXJJqTzzxxFe/+c1vHinsAnVvMLmUS7kEzRtZMzExERoaineRuLOzM3rwwQdztUaHh4dDc3Nz4XJ5+/btaO7cubnKZV9fX5g3b17hcjk6Oho1Nzc7d6J5A7v84uzu5VIu5RKmx3feyITVq1c/7AQhNvGKTbygeSMjvv3tb1985pln/jcnCDGKU4z1sGzZslaVmNSsO1NA1uT5o5qi7ezlUi7lEqbOlTcyWUj7+vpyFdOpU6cKeYKI4zju7u7OVUwXL14sbC4vXLiQq5i6u7s1bqRzvZkC7PbrZ2JiIpoxY4Z1mINchhCihoYGuYyiqFwuh6z3PJo20syVNzJfYJ9++uk/zuKJPo7jWOP227l87LHHGrP63jVuHzmxNDTEWW1+li1b1qpxI/U1xxSQJ2m/j9jNmzejRYsWWXeTUCqVQmtrer8jnsd7t9VKf39/mDNnTmrf3507d6LW1la5JDsbJFNAnrS0tMR3r8aVy+VUvKehoaEo/jWN2+S1tbXFcRzHK1asWDg+Pp6K9zQ6OvqbXGrcJm/u3Ll3py0eHR1NxXuamJiIVq1a9VAcx7HGDSCFjhw5EpK0e/fuLWa9Nt56663LSeZy3759h816bbz55psHkszloUOHrpl1gAx76aWXftjT0zOtk8GlS5fC2rVrHzWb9bV58+bvdXV1TSuXnZ2dYcOGDf9oNuvrhRde+IfOzs5p5bK7uzts2bLl+2YTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyK49e/bsHBwcDNPR19cXXn755Z+azfravXv3loGBgWnl8vbt2+G111570mzW12uvvfZkf3//tHI5MDAQdu/evcVsAmTY2bNnQ5LefvvtHrNeGx0dHYnm8ujRo8Gs18b777+faC5PnTollwBptWXLlu+HlBgbGwtLly6dLSuVWbt27aPlcjkVuZyYmAhPPPHEV2WlMmvWrPnSxMREKnJZLpfDunXr/lJWyKLYFJAn4+PjobGxMbXvr1QqRe3t7dbdJIyMjISmpqbUvr+hoaFo9uzZcjkJg4ODYfbs9O5fRkdHo+bmZrkkMxpMAVm3efPm793dTae5cYuiKGpra4vuvleZ+4+efvrpr9+dnzQ3blEURbNmzfpNLpctWzZH9n7bz372s4a785Pmxi2Koqipqek3uXz22Wf/VPZIOzsNMi3rTVAIIWpoaLAOc5DLKIqiOI7lUi6h5lx5I5Pu/rIwByeIKIQQzp07V9grcT09Pbm5EhlCCNeuXStsLq9evZqrXPb29rpCTjrPHaYAu3q7fbmUS7mUS7LDlTcyY/369X+d9++KFeW7cKtWrfqcXIo1S/GtWbPmS6owqdlQmAKy4Omnn/763//93+8rzMLM+U6/SI2NXObH0qVLm7/73e+Oqsho3sAJolAnfbmUS7mE6fGxKalXLpcL+aXhrq6u3MU9OjpayFwODAzkLu7bt28XMpdjY2N+xIDmDe7lmWee+ZOibnQXL16cq3h+9rOfNcycObOQuWxra8tdTO3t7YXM5YwZMyJPTKHeXP4l1YaHh0Nzc3Nh4z927Fj0B3/wB7lYpzdv3gwLFiwobC4vXrwYPfzww7nI5blz58LnP//5wuby1q1b0fz5850/0bzBx/Ekgvx8x0Yu5VIuoTp8bAoAoHkDAEDzBgCgeQPSqq+vLzexFP1rUqOj+bm36/DwsMUJmjf4eO+9995gkeN/5ZVX/ve8xPLGG2/8W5Fz+dprr/0oL7Hs2LHj/y1yLvfu3btHdaae/FqG1CvyL9vy9os2uZRLuYTpc+WN1HvllVf+uxNEPqxbt+4vipjL1atXP5y3mFauXHl/EXP585///P9Qlan7+cEUkAU9PT1h4cKFhYn3rbfeuvDHf/zHubwL6sWLF8Pv/d7vFSaXHR0d0Ze//OVc1trjx4+Hr3zlK4XJ5ZUrV6LPfvazzpto3mCybt++HYrwSJ48n+zv6u7uDp/5zGdyn8tLly5Fn/vc53Kdy/Pnz4eHH364CBvI6L777nPOJBV8bEpmzJkzJ75y5UquY9y3b987eW/coiiKFi9eHH/44Ye5jvH999/PfeMWRVH0+c9/Pj58+PBInmM8c+aMxg1gOrZt2/bjkENFzOXzzz//53nM5YoVKxYXLZfLli2bk8dcrl279lFVl7SxkyCz8vLQ+u7u7uj+++8v9FoslUqhtbU183H09/dH8+bNK3Qu+/r6wrx58zIfx507d6LW1lbnSDRvUAtZvWo1OjoaNTc3W4MfUS6XQxZ/ZDsxMRHNmDFDLj9ifHw8NDY2ZrGeRA0NDXJJqvnOG9nfgfza2NhYJt7vrVu3ojiOY43bxxSkhoY4juM4K3fwL5VKURzHscbtP5oxY0Ycx3FcKpUy8X6Hh4ejOI5jjRuaN0hQU1NTHMdxvG/fvnfS+P7Wr1//V3Ecx/Pnz3dy+BSzZs2K4ziOd+3atT6N72/btm0/iuM4bm9vl8tP0d7eHsdxHL/00kupfCrD7t27N8ZxHM+aNUsuAdJg06ZN3y2Xy3X5ovPw8HBYunTpbFmojueff/7Px8fH65LLsbGx8Pjjj39FFqpjzZo1XxodHa1LLicmJvwIASBrLly4UJOTwtGjR4PZTdaZM2dqksuOjg65TNjJkydrksszZ87IJbnjMjH8jrVr1z7a1tb2tba2tq+1tLR8fmho6MNSqXR4YGDg7b/7u797zQxlL5etra3/86xZs754N5elUunw3/7t375shrLj+eef//O76/JuLgcHB4+VSqXD3/jGN140QwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAYa1evfqRX/ziF69eunQpjI+Ph48zPj4eLly4EHbv3r1l1apVnzNrAAA1dvbs2VBLp0+fDmYZAKBCPT09oZ66uro0c0AqxKYASKvbt2+H9vb21L2vvr6+aMGCBeonUBcNpgBIk61bt/7g7tWuNDZuURRF8+fPj+6+x7Vr1z4qawBA4bz88ss/DRn2wgsv/IMsAklw2R+ouxBCbr5PFsexugrUlI9Ngbr54IMPQp4at7uN6Pvvv+/HDUDtNommAKiHO3fuhFmzZuU2voGBgWjOnDlqLKB5A7JvfHw8NDY25j7OkZGRqKWlRZ0FqsrHpkCihoaGCtG4RVEUNTc3R/39/T5CBTRvQDbt37+/o6WlpVAxz5kzJ9qxY8ezsg9Ui8v5QGLy9uOEKRVbv0IFqsSVNyARhw8fHi9y/G+++eYBRwFQlc2gKQCSUOSrbr8puK6+AVXgyhsAgOYNAADNGwCA5g0AAM0bwEdcuHCh0PEfO3bMQQBUhV8+AYlxnzeA6XPlDUjM9evXCxn3+fPnJR+o3mbQFABJKuLVN1fdAM0boIHTuAGaNwANnMYNSDvfeQPq1tiMj+fzcafDw8MaN0DzBuTPzJkz41/+8pcH8xTTjh07npo1a5bGDajd5tcUAGnQ398f5syZk9n339PTE913331qKqB5A4rl9u3bob29PTPvt6+vL1qwYIFaCiTGx6ZAqsyZMyeO4zh+9913+9P8Pvfv3388juNY4wYA8Ds6OjpCGhw9ejTIBgDAFHV3dyfSrF29elWzBgBQC08//fTXz5w5E8rl8pQatHK5HE6fPh0ef/zxr5hFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgOz7/wBbEsHC3tuxBQAAAABJRU5ErkJggg==</Content><Id>eb622b8350e7bd0f4f3a68f478ffcba6b46b88f195d2bc5cd757bf17c8f205b7</Id></CustomIcon>`