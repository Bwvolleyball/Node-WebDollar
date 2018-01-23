const colors = require('colors/safe');
import NodesList from 'node/lists/nodes-list'
import InterfaceBlockchainProtocol from "./../protocol/Interface-Blockchain-Protocol"
import MiniBlockchainProtocol from "common/blockchain/mini-blockchain/protocol/Mini-Blockchain-Protocol"
/**
 *
 * Agent 47   - The place I was raised, they didn't give us names. They gave us numbers. Mine was 47.
 *
 *
 * An Agent is a class that force your machine to synchronize to the network based on the protocol you use it
 */

class InterfaceBlockchainAgent{

    constructor( blockchain, blockchainProtocolClass ){

        this.AGENT_TIME_OUT = 10000;
        this.AGENT_QUEUE_COUNT_MAX = 2;
        this.NODES_LIST_MINIM_LENGTH = 2;

        this.blockchain = blockchain;
        if ( blockchainProtocolClass === undefined) blockchainProtocolClass = InterfaceBlockchainProtocol;

        this.protocol = new blockchainProtocolClass(this.blockchain);
        this.initializeProtocol();

        this.agentQueueCount = 0;

        this.requestBlockchainForNewPeer();
    }

    initializeProtocol(){

        this.protocol.initialize(["acceptBlockHeaders"]);
    }

    requestBlockchainForNewPeer(){

        NodesList.emitter.on("nodes-list/connected", async (result) => {

            // let's ask everybody

            try {

                let answerBlockchain = await this.protocol.askBlockchain(result.socket);

            } catch (exception){
                console.log(colors.red("Error asking for Blockchain"));
            }

            result.socket.node.protocol.agent.startedAgentDone = true;
            this.agentQueueCount++;

            //check if start Agent is finished
            if (this.startAgentResolver !== undefined) {

                let done = true;
                for (let i = 0; i < NodesList.nodes.length; i++)
                    if (NodesList.nodes[i].socket.level <= 3 && NodesList.nodes[i].socket.node.protocol.agent.startedAgentDone === false) {
                        done = false;
                        console.log("not done", NodesList.nodes[i]);
                        break;
                    }

                //in case the agent is done and at least 4 nodes were tested
                if (done === true && this.startAgentResolver !== undefined &&
                    NodesList.nodes.length >= this.NODES_LIST_MINIM_LENGTH && this.agentQueueCount >= this.AGENT_QUEUE_COUNT_MAX) {

                    clearTimeout(this.startAgentTimeOut);

                    let resolver = this.startAgentResolver;
                    this.startAgentResolver = undefined;

                    console.log(colors.green("Synchronization done"));

                    resolver({
                        result: true,
                        message: "Start Agent worked successfully",
                    });

                }

            }


        });

        NodesList.emitter.on("nodes-list/disconnected", (result) => {

        });

    }

    startAgent(){

        console.log(colors.yellow("startAgent was started"));

        return new Promise((resolve)=>{

            this.startAgentResolver = resolve;

            this.startAgentTimeOut = setTimeout(()=>{

                this.startAgentResolver = undefined;

                console.log( colors.green("Synchronization done FAILED") );

                resolve({
                    result: false,
                    message: "Start Agent Timeout",
                });

            }, this.AGENT_TIME_OUT);

        })

    }

    _setBlockchain(newBlockchain){

        this.blockchain = newBlockchain;
        this.protocol._setBlockchain(newBlockchain);
    }

}

export default InterfaceBlockchainAgent;