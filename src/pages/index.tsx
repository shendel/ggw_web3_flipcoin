import type { AppProps } from "next/app"
import Head from 'next/head'
import getConfig from 'next/config'


import { useRouter } from "next/router"
import { useEffect, useState } from "react"

import AppRootWrapper from '@/components/AppRootWrapper'
import MyFlipGame from '@/views/'

import {
  TITLE,
  SEO_DESC
} from '@/config'
function MyApp(pageProps) {

  
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={SEO_DESC} />
      </Head>
      <AppRootWrapper>
        <MyFlipGame />
      </AppRootWrapper>
    </>
  )
}

export default MyApp;
