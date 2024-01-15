import type { NextApiRequest, NextApiResponse } from 'next'
import { getExistingVectorStore } from "@/utils/vector";
import { getModel } from "@/utils/openai";
import { loadQAStuffChain } from "langchain/chains";
import { getKeyConfiguration } from '@/utils/app/configuration';
import { PromptTemplate } from 'langchain';

export const config = {
    api: {
        bodyParser: false,
    }
};

const template = `Sử dụng các phần ngữ cảnh sau đây để trả lời câu hỏi ở cuối.
Nếu không biết câu trả lời, bạn chỉ cần nói rằng bạn không biết, đừng cố bịa ra câu trả lời.
Luôn nói "cảm ơn vì đã hỏi thăm!" ở cuối câu trả lời.Trả lời bằng tiếng việt
{context}
Question: {question}
Helpful Answer:`;

const QA_CHAIN_PROMPT = new PromptTemplate({
    inputVariables: ["context", "question"],
    template,
});
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    console.log("beginning handler");
    const keyConfiguration = getKeyConfiguration(req);

    const message: string = req.query.message as string;
    const indexName: string = req.query.indexName as string;

    console.log("handler chatfile query: ", message, indexName);
    const vectorStore = await getExistingVectorStore(keyConfiguration, indexName);

    const documents = await vectorStore.similaritySearch(message, 2);
    const llm = await getModel(keyConfiguration, res);
    const stuffChain = loadQAStuffChain(llm, { prompt: QA_CHAIN_PROMPT });

    try {
        stuffChain.call({
            input_documents: documents,
            question: message,
        }).catch(console.error);
        // res.status(200).json({ responseMessage: chainValues.text.toString() });
    } catch (e) {
        console.log("error in handler: ", e);
        res.status(500).json({ errorMessage: (e as Error).toString() });
    }

}

export default handler;