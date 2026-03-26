import axios from 'axios';
import fs from "fs-extra";

export async function getTitleSlugIdMapping() {
    const mapping = {};
    let skip = 0;
    const limit = 100;

    while (true) {
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
            variables: { "categorySlug": "all-code-essentials", "skip": skip, "limit": limit, "filters": {} }
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
        const { total, questions: problems } = response.data.problemsetQuestionList;
        for (const problem of problems) {
            mapping[problem.titleSlug] = problem.questionFrontendId;
        }
        skip += limit;
        if (skip >= total) break;
    }

    console.log(`Mapping loaded: ${Object.keys(mapping).length} problems`);
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

    let contestData = fs.readJSONSync("./contestData.json");

    // Collect all new contests across all pages
    const newContests = [];
    for (let i = 1; i <= pages; i++) {
        const pastContests = await getPastContests(i);
        for (const contest of pastContests.data) {
            if(contestData[contest.title]) continue;
            newContests.push(contest);
        }
        console.log(`Scanned page ${i}`);
    }

    // Process new contests oldest-first so newest ends up on top after prepending
    for (const contest of newContests.reverse()) {
        contestData = {
            [contest.title]: [],
            ...contestData,
        }
        const questions = await getContestQuestions(contest.titleSlug);
        for(const question of questions) {
            contestData[contest.title].push(mapping[question.titleSlug] ?? null);
        }
        console.log(`Collected ${contest.title} data`);
        fs.writeJSONSync("./contestData.json", contestData);
    }
    console.log(`Added ${newContests.length} new contests`);
}

start();