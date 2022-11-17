import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import DKIM from 'nodemailer/lib/dkim';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ConnectionOptions } from 'tls';

interface INodemailerConfig {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  dkim?: DKIM.SingleKeyOptions | undefined;
  ignoreTls?: boolean;
  requireTls?: boolean;
  tlsOptions?: ConnectionOptions;
}

export class NodemailerProvider implements IEmailProvider {
  id = 'nodemailer';

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transports: Transporter;

  constructor(private config: INodemailerConfig) {
    let dkim = this.config.dkim;

    if (!dkim?.domainName || !dkim?.privateKey || !dkim?.keySelector) {
      dkim = undefined;
    }

    const tls: ConnectionOptions = this.getTlsOptions();

    const smtpTransportOptions: SMTPTransport.Options = {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      dkim,
      ignoreTLS: this.config.ignoreTls,
      requireTLS: this.config.requireTls,
      ...(tls && { tls }),
    };

    this.transports = nodemailer.createTransport(smtpTransportOptions);
  }

  getTlsOptions(): ConnectionOptions | undefined {
    /**
     * Only render TLS options if secure is enabled to true.
     * Reference: https://nodemailer.com/smtp/#tls-options
     *
     */
    if (this.config.secure && !!this.config.tlsOptions) {
      this.validateTlsOptions();

      return this.config.tlsOptions;
    }

    return undefined;
  }

  validateTlsOptions(): void {
    try {
      JSON.parse(JSON.stringify(this.config.tlsOptions));
    } catch {
      throw new Error(
        'TLS options is not a valid JSON. Check again the environment variable NODEMAILER_TLS_OPTIONS'
      );
    }
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const info = await this.transports.sendMail(mailData);

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);
      await this.transports.sendMail(mailData);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        // nodemailer does not provide a way to distinguish errors
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private createMailData(options: IEmailOptions): SendMailOptions {
    return {
      from: options.from || this.config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file,
        contentType: attachment.mime,
      })),
    };
  }
}
