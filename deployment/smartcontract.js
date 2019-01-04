const abi = [];
const bytecode = '';

tronWeb.transactionBuilder.createSmartContract(
  abi,
  bytecode,
  100,
  'TWez8ab53FMaqTcCLpnMAUWvrxoYcXyRnq',
  0,
  100,
  async (err, res) => {
    const signedTransaction = await tronWeb.trx.sign(res.transaction);
    tronWeb.trx.sendRawTransaction(
      signedTransaction,
      async (sendError, result) => {
        if (sendError) {
          console.log(sendError);
          console.log(signedTransaction.txID);
        }
        console.log(signedTransaction.txID);
      }
    );
  }
);
