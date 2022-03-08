import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Link from "next/link";
import Navbar from "../components/Navbar"
import InitDex from '../components/send';

export default function Funds() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Akura</title>
        <meta name="description" content="Akura Protocol" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <p>test</p>
      <p>test</p>
      <p>test</p>
      <p>test</p>
      <InitDex />
      <p>test</p>
      <p>test</p>
      <p>test</p>
      <p>test</p>

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}