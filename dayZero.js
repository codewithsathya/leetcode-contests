import axios from 'axios';
import fs from "fs-extra";

export async function getTitleSlugIdMapping() {
    let data = JSON.stringify({
        query: `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
            problemsetQuestionList: questionList(
                categorySlug: $categorySlug
                limit: $limit
                skip: $skip
                filters: $filters
            ) {
                total: totalNum
                questions: data {
                    questionFrontendId
                    titleSlug
                }
            }
        }`,
        variables: { "categorySlug": "all-code-essentials", "skip": 0, "limit": 100000, "filters": {} }
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://leetcode.com/graphql/',
        headers: {
            'Content-Type': 'application/json',
        },
        data: data
    };

    const { data: response } = await axios.request(config);
    const problems = response.data.problemsetQuestionList.questions
    const mapping = {};
    for(const problem of problems) {
        mapping[problem.titleSlug] = problem.questionFrontendId
    }
    return mapping;
}

export async function getPastContests(pageNo) {
    let data = JSON.stringify({
        query: `query pastContests($pageNo: Int, $numPerPage: Int) {
            pastContests(pageNo: $pageNo, numPerPage: $numPerPage) {
                pageNum
                currentPage
                totalNum
                numPerPage
                data {
                    title
                    titleSlug
                    startTime
                    originStartTime
                }
            }
        }`,
        variables: { "pageNo": pageNo }
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://leetcode.com/graphql/',
        headers: {
            'accept': '*/*',
            'content-type': 'application/json',
        },
        data: data
    };
    const { data: response } = await axios.request(config);
    return response.data.pastContests;
}

export async function getContestQuestions(contestSlug) {
    let data = JSON.stringify({
        query: `query contestQuestionList($contestSlug: String!) {
            contestQuestionList(contestSlug: $contestSlug) {
                titleSlug
                titleCn
                questionId
                isContest
            }
        }`,
        variables: { contestSlug }
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://leetcode.com/graphql/',
        headers: {
            'accept': '*/*',
            'content-type': 'application/json',
        },
        data: data
    };

    const { data: response } =  await axios.request(config)
    const questions = response.data.contestQuestionList
    return questions;
}

async function start() {
    const mapping = await getTitleSlugIdMapping();
    const pastContests = await getPastContests(1);
    const pages = pastContests.pageNum;
    const allContests = [];

    let contestData = fs.readJSONSync("./contestData.json");

    for (let i = 1; i <= pages; i++) {
        const pastContests = await getPastContests(i);
        const contests = pastContests.data.reverse();
        for (const contest of contests) {
            if(contestData[contest.title]) continue;
            contestData = {
                [contest.title]: [],
                ...contestData,
            }
            allContests.push(contest);
            const questions = await getContestQuestions(contest.titleSlug);
            for(const question of questions) {
                const id = mapping[question.titleSlug]
                contestData[contest.title].push(id);
            }
            console.log(`Collected ${contest.title} data`);
            fs.writeJSONSync("./contestData.json", contestData);
        }
        console.log(`Extracting ${i}`);
    }
    console.log(allContests);
}

start();